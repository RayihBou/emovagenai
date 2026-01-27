"""
Lambda de análisis de sesión completa: Múltiples WAV + XML → Transcribe → Bedrock
Flujo: Audios S3 + XMLs → Concatenar → Transcribe → Enriquecer con metadatos → Bedrock → Scoring
"""
import json
import boto3
import os
import time
import xml.etree.ElementTree as ET
from datetime import datetime

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

METADATOS DE INTERVENCIONES (quién habla cuándo):
{metadatos_intervenciones}

TRANSCRIPCIÓN COMPLETA:
{transcripcion}

Evalúa según estos criterios (25% cada uno):

1. FRASEOLOGÍA (0-10): Uso de términos oficiales como "Afirmativo", "Copiado", "Solicito", "Confirme", "Repita"
2. CLARIDAD (0-10): Mensajes completos, sin ambigüedades, ubicación exacta
3. PROTOCOLO (0-10): Identificación emisor/receptor, estructura correcta, turnos de habla
4. FORMALIDAD (0-10): Lenguaje profesional, sin apodos ni coloquialismos

Responde ÚNICAMENTE con JSON válido:
{{
  "score": <promedio 0-10>,
  "fraseologia": <0-10>,
  "claridad": <0-10>,
  "protocolo": <0-10>,
  "formalidad": <0-10>,
  "justification": "<explicación del análisis de la sesión>",
  "errores_detectados": ["<error1>", "<error2>"],
  "recommendations": ["<mejora1>", "<mejora2>"],
  "analisis_por_operador": {{
    "<operador_id>": {{"score": <0-10>, "observacion": "<breve>"}}
  }}
}}"""

def parse_callrefs_xml(xml_content):
    """Parsea CallRefs.xml para obtener info de llamadas"""
    root = ET.fromstring(xml_content)
    calls = {}
    for callref in root.findall('callref'):
        tetra_id = callref.get('TetraCallRef')
        calls[tetra_id] = {
            'calling_id': callref.get('CallingID'),
            'called_id': callref.get('CalledID'),
            'duration': int(callref.get('Duration', 0)),
            'timestamp': callref.get('FromDateLoc'),
            'type': callref.get('Type')
        }
    return calls

def parse_holders_xml(xml_content):
    """Parsea Holders.xml para obtener info de dispositivos"""
    root = ET.fromstring(xml_content)
    holders = {}
    for holder in root.findall('holder'):
        holder_id = holder.get('ID')
        holders[holder_id] = {
            'tetra_address': holder.get('TetraAddress'),
            'type': holder.get('Type'),
            'name': holder.get('Name') or f"Operador-{holder_id}"
        }
    return holders

def parse_recording_xml(xml_content):
    """Parsea XML de recording individual para obtener intervenciones"""
    root = ET.fromstring(xml_content)
    recordings = []
    for rec in root.findall('recording'):
        recordings.append({
            'start': rec.get('StartDate'),
            'duration': int(rec.get('Duration', 0)),
            'talking_id': rec.get('TalkingID'),
            'calling_id': rec.get('CallingID')
        })
    return recordings

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        audio_keys = body.get('audio_keys', [])
        xml_keys = body.get('xml_keys', {})
        
        if not audio_keys:
            return response(400, {'error': 'audio_keys requerido'})
        
        # 1. Parsear XMLs de metadatos si existen
        holders = {}
        callrefs = {}
        all_interventions = []
        
        if xml_keys.get('holders'):
            obj = s3.get_object(Bucket=BUCKET, Key=xml_keys['holders'])
            holders = parse_holders_xml(obj['Body'].read().decode('utf-8'))
        
        if xml_keys.get('callrefs'):
            obj = s3.get_object(Bucket=BUCKET, Key=xml_keys['callrefs'])
            callrefs = parse_callrefs_xml(obj['Body'].read().decode('utf-8'))
        
        # Parsear XMLs de recordings
        for rec_key in xml_keys.get('recordings', []):
            obj = s3.get_object(Bucket=BUCKET, Key=rec_key)
            interventions = parse_recording_xml(obj['Body'].read().decode('utf-8'))
            all_interventions.extend(interventions)
        
        # Ordenar intervenciones por timestamp
        all_interventions.sort(key=lambda x: x['start'])
        
        # 2. Transcribir cada audio y combinar
        all_transcripts = []
        total_duration = 0
        
        for audio_key in sorted(audio_keys):
            job_name = f"emova-{context.aws_request_id[:6]}-{audio_key.split('/')[-1].replace('.wav','')}"[:64]
            
            transcribe.start_transcription_job(
                TranscriptionJobName=job_name,
                LanguageCode='es-ES',
                MediaFormat='wav',
                Media={'MediaFileUri': f's3://{BUCKET}/{audio_key}'},
                OutputBucketName=BUCKET,
                OutputKey=f'transcriptions/{job_name}.json',
                Settings={'ShowSpeakerLabels': True, 'MaxSpeakerLabels': 10}
            )
            
            # Esperar transcripción
            while True:
                status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
                job_status = status['TranscriptionJob']['TranscriptionJobStatus']
                if job_status == 'COMPLETED':
                    break
                elif job_status == 'FAILED':
                    continue  # Skip failed audio
                time.sleep(2)
            
            # Leer transcripción
            trans_obj = s3.get_object(Bucket=BUCKET, Key=f'transcriptions/{job_name}.json')
            trans_data = json.loads(trans_obj['Body'].read().decode('utf-8'))
            transcript = trans_data.get('results', {}).get('transcripts', [{}])[0].get('transcript', '')
            
            if transcript:
                # Extraer TetraCallRef del nombre del archivo
                tetra_id = audio_key.split('/')[-1].replace('.wav', '')
                call_info = callrefs.get(tetra_id, {})
                caller = holders.get(call_info.get('calling_id', ''), {}).get('name', call_info.get('calling_id', 'Desconocido'))
                
                all_transcripts.append(f"[{call_info.get('timestamp', '')} - {caller}]: {transcript}")
                total_duration += call_info.get('duration', 0)
        
        if not all_transcripts:
            return response(400, {'error': 'No se pudo transcribir ningún audio'})
        
        # 3. Preparar metadatos para el prompt
        participantes = set()
        for inv in all_interventions:
            talking_id = inv['talking_id']
            name = holders.get(talking_id, {}).get('name', f"Operador-{talking_id}")
            participantes.add(name)
        
        metadatos_str = "\n".join([
            f"- {inv['start']}: {holders.get(inv['talking_id'], {}).get('name', inv['talking_id'])} habla {inv['duration']}s"
            for inv in all_interventions[:20]  # Limitar a 20 para no exceder contexto
        ])
        
        # 4. Evaluar con Bedrock
        prompt = PROMPT_TEMPLATE.format(
            duracion_total=total_duration or sum(i['duration'] for i in all_interventions),
            participantes=", ".join(participantes) or "No identificados",
            num_intervenciones=len(all_interventions),
            metadatos_intervenciones=metadatos_str or "No disponibles",
            transcripcion="\n".join(all_transcripts)
        )
        
        bedrock_response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}]
            })
        )
        
        result = json.loads(bedrock_response['body'].read())
        evaluation = json.loads(result['content'][0]['text'])
        
        # 5. Retornar resultado enriquecido
        return response(200, {
            'transcript': "\n".join(all_transcripts),
            'evaluation': evaluation,
            'session_info': {
                'total_duration': total_duration,
                'num_audios': len(audio_keys),
                'num_interventions': len(all_interventions),
                'participants': list(participantes)
            },
            'interventions': all_interventions[:30]  # Timeline para visualización
        })
        
    except Exception as e:
        import traceback
        return response(500, {'error': str(e), 'trace': traceback.format_exc()})

def response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }
