import json
import boto3
import os
import uuid

s3 = boto3.client('s3')
BUCKET = os.environ['AUDIO_BUCKET']

def handler(event, context):
    filename = event.get('queryStringParameters', {}).get('filename', f'{uuid.uuid4()}.wav')
    key = filename if '/' in filename else f'input/{filename}'
    
    # Determinar content type
    content_type = 'application/octet-stream'
    if filename.endswith('.wav'):
        content_type = 'audio/wav'
    elif filename.endswith('.xml'):
        content_type = 'application/xml'
    elif filename.endswith('.mp3'):
        content_type = 'audio/mpeg'
    
    url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': BUCKET, 'Key': key, 'ContentType': content_type},
        ExpiresIn=300
    )
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'upload_url': url, 'key': key})
    }
