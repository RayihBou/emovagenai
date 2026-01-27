"""Lambda para consultar estado del job"""
import json
import boto3
import os

s3 = boto3.client('s3')
BUCKET = os.environ['AUDIO_BUCKET']

def handler(event, context):
    try:
        job_id = event.get('pathParameters', {}).get('job_id')
        if not job_id:
            return response(400, {'error': 'job_id requerido'})
        
        try:
            obj = s3.get_object(Bucket=BUCKET, Key=f'jobs/{job_id}.json')
            job_data = json.loads(obj['Body'].read().decode('utf-8'))
            return response(200, job_data)
        except s3.exceptions.NoSuchKey:
            return response(404, {'error': 'Job no encontrado'})
            
    except Exception as e:
        return response(500, {'error': str(e)})

def response(status, body):
    return {
        'statusCode': status,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False)
    }
