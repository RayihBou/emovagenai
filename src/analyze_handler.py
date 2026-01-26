"""
Lambda de análisis completo: Transcribe + Bedrock
Flujo: Audio S3 → Transcribe → Bedrock → Scoring JSON
"""
import json
import boto3
import os
import time
import base64

transcribe = boto3.client('transcribe')
bedrock = boto3.client('bedrock-runtime')
s3 = boto3.client('s3')

BUCKET = os.environ['AUDIO_BUCKET']
MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'

PROMPT_TEMPLATE = """Eres un evaluador experto en comunicaciones ferroviarias operativas del metro de Buenos Aires.

Evalúa la siguiente transcripción según estos criterios (25% cada uno):

1. FRASEOLOGÍA (0-10): Uso de términos oficiales como "Afirmativo", "Copiado", "Solicito", "Confirme", "Repita"
2. CLARIDAD (0-10): Mensaje completo, sin ambigüedades, ubicación exacta
3. PROTOCOLO (0-10): Identificación emisor/receptor, estructura correcta
4. FORMALIDAD (0-10): Lenguaje profesional, sin apodos ni coloquialismos

TRANSCRIPCIÓN:
{transcripcion}

Responde ÚNICAMENTE con JSON válido:
{{"score": <promedio 0-10>, "fraseologia": <0-10>, "claridad": <0-10>, "protocolo": <0-10>, "formalidad": <0-10>, "justification": "<explicación>", "errores_detectados": ["<error1>"], "recommendations": ["<mejora1>"]}}"""

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        audio_key = body.get('audio_key')
        
        if not audio_key:
            return response(400, {'error': 'audio_key requerido'})
        
        # 1. Iniciar transcripción
        job_name = f"emova-{context.aws_request_id[:8]}"
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            LanguageCode='es-ES',
            MediaFormat=audio_key.split('.')[-1] or 'mp3',
            Media={'MediaFileUri': f's3://{BUCKET}/{audio_key}'},
            OutputBucketName=BUCKET,
            OutputKey=f'transcriptions/{job_name}.json',
            Settings={'ShowSpeakerLabels': True, 'MaxSpeakerLabels': 5}
        )
        
        # 2. Esperar transcripción (polling)
        while True:
            status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            job_status = status['TranscriptionJob']['TranscriptionJobStatus']
            if job_status == 'COMPLETED':
                break
            elif job_status == 'FAILED':
                return response(500, {'error': 'Transcripción falló'})
            time.sleep(2)
        
        # 3. Leer transcripción
        trans_obj = s3.get_object(Bucket=BUCKET, Key=f'transcriptions/{job_name}.json')
        trans_data = json.loads(trans_obj['Body'].read().decode('utf-8'))
        transcript = trans_data.get('results', {}).get('transcripts', [{}])[0].get('transcript', '')
        
        if not transcript:
            return response(400, {'error': 'No se pudo transcribir el audio'})
        
        # 4. Evaluar con Bedrock
        prompt = PROMPT_TEMPLATE.replace('{transcripcion}', transcript)
        bedrock_response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}]
            })
        )
        
        result = json.loads(bedrock_response['body'].read())
        evaluation = json.loads(result['content'][0]['text'])
        
        # 5. Retornar resultado
        return response(200, {
            'transcript': transcript,
            'evaluation': evaluation
        })
        
    except Exception as e:
        return response(500, {'error': str(e)})

def response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }
