"""Lambda para procesar job en background - Transcribe + Bedrock"""
import json
import boto3
import os
import time
import xml.etree.ElementTree as ET

transcribe = boto3.client('transcribe')
bedrock = boto3.client('bedrock-runtime')
s3 = boto3.client('s3')

BUCKET = os.environ['AUDIO_BUCKET']
MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'

PROMPT_TEMPLATE = """Eres un evaluador experto en comunicaciones ferroviarias operativas del metro de Buenos Aires.

Analiza la siguiente SESIÓN COMPLETA de comunicaciones del sistema TETRA entre operadores.

CONTEXTO DE LA SESIÓN:
- Duración total: {duracion_total} segundos
- Participantes: {participantes}
- Cantidad de intervenciones: {num_intervenciones}

METADATOS DE INTERVENCIONES:
{metadatos_intervenciones}

TRANSCRIPCIÓN COMPLETA:
{transcripcion}

Evalúa según estos criterios (25% cada uno):
1. FRASEOLOGÍA (0-10): Uso de términos oficiales
2. CLARIDAD (0-10): Mensajes completos, sin ambigüedades
3. PROTOCOLO (0-10): Identificación emisor/receptor, estructura correcta
4. FORMALIDAD (0-10): Lenguaje profesional

Responde ÚNICAMENTE con JSON válido (sin texto adicional):
{{
  "score": <promedio numérico 0-10>,
  "fraseologia": <número 0-10>,
  "claridad": <número 0-10>,
  "protocolo": <número 0-10>,
  "formalidad": <número 0-10>,
  "justification": "<explicación breve>",
  "errores_detectados": ["<error1>", "<error2>"],
  "recommendations": ["<mejora1>", "<mejora2>"],
  "analisis_por_operador": {{
    "<nombre_operador>": {{"score": <número 0-10>, "observacion": "<comentario breve>"}}
  }}
}}

IMPORTANTE: En analisis_por_operador, incluye TODOS los participantes con su score numérico y observación."""""

def update_job(job_id, updates):
    """Actualiza estado del job en S3"""
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=f'jobs/{job_id}.json')
        job_data = json.loads(obj['Body'].read())
    except:
        job_data = {'job_id': job_id}
    job_data.update(updates)
    s3.put_object(Bucket=BUCKET, Key=f'jobs/{job_id}.json', Body=json.dumps(job_data, ensure_ascii=False), ContentType='application/json')

def parse_callrefs_xml(xml_content):
    root = ET.fromstring(xml_content)
    return {cr.get('TetraCallRef'): {'calling_id': cr.get('CallingID'), 'duration': int(cr.get('Duration', 0)), 'timestamp': cr.get('FromDateLoc')} for cr in root.findall('callref')}

def parse_holders_xml(xml_content):
    root = ET.fromstring(xml_content)
    return {h.get('ID'): {'name': h.get('Name') or f"Op-{h.get('ID')}"} for h in root.findall('holder')}

def parse_recording_xml(xml_content):
    root = ET.fromstring(xml_content)
    return [{'start': r.get('StartDate'), 'duration': int(r.get('Duration', 0)), 'talking_id': r.get('TalkingID')} for r in root.findall('recording')]

def handler(event, context):
    job_id = event['job_id']
    audio_keys = event['audio_keys']
    xml_keys = event.get('xml_keys', {})
    
    try:
        update_job(job_id, {'status': 'processing', 'progress': 5})
        
        # Parsear XMLs
        holders, callrefs, interventions = {}, {}, []
        if xml_keys.get('holders'):
            holders = parse_holders_xml(s3.get_object(Bucket=BUCKET, Key=xml_keys['holders'])['Body'].read().decode('utf-8'))
        if xml_keys.get('callrefs'):
            callrefs = parse_callrefs_xml(s3.get_object(Bucket=BUCKET, Key=xml_keys['callrefs'])['Body'].read().decode('utf-8'))
        for rec_key in xml_keys.get('recordings', []):
            interventions.extend(parse_recording_xml(s3.get_object(Bucket=BUCKET, Key=rec_key)['Body'].read().decode('utf-8')))
        interventions.sort(key=lambda x: x['start'])
        
        update_job(job_id, {'progress': 10})
        
        # Transcribir audios
        all_transcripts = []
        total_duration = 0
        num_audios = len(audio_keys)
        
        for i, audio_key in enumerate(sorted(audio_keys)):
            job_name = f"emova-{job_id}-{audio_key.split('/')[-1].replace('.wav','')}"[:64]
            
            transcribe.start_transcription_job(
                TranscriptionJobName=job_name, LanguageCode='es-ES', MediaFormat='wav',
                Media={'MediaFileUri': f's3://{BUCKET}/{audio_key}'},
                OutputBucketName=BUCKET, OutputKey=f'transcriptions/{job_name}.json',
                Settings={'ShowSpeakerLabels': True, 'MaxSpeakerLabels': 10}
            )
            
            while True:
                status = transcribe.get_transcription_job(TranscriptionJobName=job_name)['TranscriptionJob']['TranscriptionJobStatus']
                if status == 'COMPLETED': break
                elif status == 'FAILED': break
                time.sleep(3)
            
            if status == 'COMPLETED':
                trans_data = json.loads(s3.get_object(Bucket=BUCKET, Key=f'transcriptions/{job_name}.json')['Body'].read())
                transcript = trans_data.get('results', {}).get('transcripts', [{}])[0].get('transcript', '')
                if transcript:
                    tetra_id = audio_key.split('/')[-1].replace('.wav', '')
                    call_info = callrefs.get(tetra_id, {})
                    caller = holders.get(call_info.get('calling_id', ''), {}).get('name', 'Operador')
                    all_transcripts.append(f"[{call_info.get('timestamp', '')} - {caller}]: {transcript}")
                    total_duration += call_info.get('duration', 0)
            
            progress = 10 + int((i + 1) / num_audios * 70)
            update_job(job_id, {'progress': progress})
        
        if not all_transcripts:
            update_job(job_id, {'status': 'error', 'error': 'No se pudo transcribir ningún audio'})
            return
        
        update_job(job_id, {'progress': 85})
        
        # Evaluar con Bedrock
        participantes = {holders.get(inv['talking_id'], {}).get('name', f"Op-{inv['talking_id']}") for inv in interventions}
        metadatos_str = "\n".join([f"- {inv['start']}: {holders.get(inv['talking_id'], {}).get('name', inv['talking_id'])} ({inv['duration']}s)" for inv in interventions[:20]])
        
        prompt = PROMPT_TEMPLATE.format(
            duracion_total=total_duration or sum(i['duration'] for i in interventions),
            participantes=", ".join(participantes) or "No identificados",
            num_intervenciones=len(interventions),
            metadatos_intervenciones=metadatos_str or "No disponibles",
            transcripcion="\n".join(all_transcripts)
        )
        
        bedrock_response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps({"anthropic_version": "bedrock-2023-05-31", "max_tokens": 2048, "messages": [{"role": "user", "content": prompt}]})
        )
        evaluation = json.loads(json.loads(bedrock_response['body'].read())['content'][0]['text'])
        
        # Guardar resultado final
        update_job(job_id, {
            'status': 'done',
            'progress': 100,
            'result': {
                'transcript': "\n".join(all_transcripts),
                'evaluation': evaluation,
                'session_info': {'total_duration': total_duration, 'num_audios': len(audio_keys), 'num_interventions': len(interventions), 'participants': list(participantes)},
                'interventions': interventions[:30]
            }
        })
        
    except Exception as e:
        import traceback
        update_job(job_id, {'status': 'error', 'error': str(e), 'trace': traceback.format_exc()})
