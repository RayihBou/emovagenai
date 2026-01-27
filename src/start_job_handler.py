"""Lambda para iniciar job asíncrono - retorna job_id inmediatamente"""
import json
import boto3
import os
import uuid

s3 = boto3.client('s3')
lambda_client = boto3.client('lambda')

BUCKET = os.environ['AUDIO_BUCKET']
PROCESS_FUNCTION = os.environ['PROCESS_FUNCTION_NAME']

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        audio_keys = body.get('audio_keys', [])
        xml_keys = body.get('xml_keys', {})
        
        if not audio_keys:
            return response(400, {'error': 'audio_keys requerido'})
        
        # Generar job_id único
        job_id = str(uuid.uuid4())[:8]
        
        # Guardar estado inicial en S3
        job_data = {
            'job_id': job_id,
            'status': 'pending',
            'audio_keys': audio_keys,
            'xml_keys': xml_keys,
            'progress': 0
        }
        s3.put_object(
            Bucket=BUCKET,
            Key=f'jobs/{job_id}.json',
            Body=json.dumps(job_data),
            ContentType='application/json'
        )
        
        # Invocar Lambda de procesamiento de forma asíncrona
        lambda_client.invoke(
            FunctionName=PROCESS_FUNCTION,
            InvocationType='Event',  # Async
            Payload=json.dumps({'job_id': job_id, 'audio_keys': audio_keys, 'xml_keys': xml_keys})
        )
        
        return response(202, {'job_id': job_id, 'status': 'pending'})
        
    except Exception as e:
        return response(500, {'error': str(e)})

def response(status, body):
    return {
        'statusCode': status,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps(body)
    }
