import json
import boto3
import os
from urllib.parse import unquote_plus

transcribe = boto3.client('transcribe')
s3 = boto3.client('s3')

def handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = unquote_plus(event['Records'][0]['s3']['object']['key'])
    
    job_name = key.replace('input/', '').replace('/', '-').replace('.', '-')
    job_name = f"emova-{job_name}-{context.aws_request_id[:8]}"
    
    media_uri = f"s3://{bucket}/{key}"
    output_key = key.replace('input/', 'transcriptions/').rsplit('.', 1)[0] + '.json'
    
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        LanguageCode='es-ES',
        MediaFormat=key.split('.')[-1],
        Media={'MediaFileUri': media_uri},
        OutputBucketName=bucket,
        OutputKey=output_key,
        Settings={
            'ShowSpeakerLabels': True,
            'MaxSpeakerLabels': 5
        }
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'job_name': job_name,
            'output_key': output_key
        })
    }
