"""
Lambda de análisis de transcripciones con Amazon Bedrock.

Modelo: Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20241022-v2:0)

Justificación de selección de modelo:
- Balance óptimo entre costo y calidad para análisis de texto estructurado
- Respuesta rápida (~3-5s) ideal para demos en vivo
- Costo: $3/1M input, $15/1M output (vs $5/$25 de Claude 4.5 Opus)
- La tarea (evaluar transcripción vs criterios definidos) no requiere 
  "extended thinking" ni razonamiento multi-documento de modelos superiores
- Claude 4/4.5 se recomendaría para agentes autónomos o análisis multi-step complejos

Metodología de evaluación:
- Basada en estándares UIC 751-3 y normativas ALAF
- 4 criterios: Fraseología, Claridad, Protocolo, Formalidad (25% cada uno)
- Prompt optimizado en config/prompts/evaluation_prompt.txt
"""

import json
import boto3
import os

bedrock = boto3.client('bedrock-runtime')
s3 = boto3.client('s3')

MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0'
PROMPT_KEY = 'config/prompts/evaluation_prompt.txt'

def handler(event, context):
    bucket = os.environ['AUDIO_BUCKET']
    transcription_key = event.get('transcription_key')
    
    # Leer transcripción
    response = s3.get_object(Bucket=bucket, Key=transcription_key)
    transcription_data = json.loads(response['Body'].read().decode('utf-8'))
    
    transcript = transcription_data.get('results', {}).get('transcripts', [{}])[0].get('transcript', '')
    
    # Leer prompt desde S3
    try:
        prompt_response = s3.get_object(Bucket=bucket, Key=PROMPT_KEY)
        prompt_template = prompt_response['Body'].read().decode('utf-8')
    except:
        # Fallback a prompt embebido si no existe en S3
        prompt_template = get_default_prompt()
    
    prompt = prompt_template.replace('{transcripcion}', transcript)

    # Llamar a Bedrock
    response = bedrock.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}]
        })
    )
    
    result = json.loads(response['body'].read())
    evaluation = json.loads(result['content'][0]['text'])
    
    # Guardar resultado
    output_key = transcription_key.replace('transcriptions/', 'results/')
    output = {
        'transcription_key': transcription_key,
        'transcript': transcript,
        'evaluation': evaluation
    }
    
    s3.put_object(
        Bucket=bucket,
        Key=output_key,
        Body=json.dumps(output, ensure_ascii=False, indent=2),
        ContentType='application/json'
    )
    
    return {'statusCode': 200, 'body': json.dumps(output)}

def get_default_prompt():
    return """Evalúa la siguiente transcripción de comunicación ferroviaria.

CRITERIOS (25% cada uno):
1. Fraseología: Uso de "Afirmativo", "Copiado", "Solicito", "Confirme"
2. Claridad: Mensaje completo sin ambigüedades
3. Protocolo: Identificación emisor/receptor, estructura correcta
4. Formalidad: Lenguaje profesional, sin apodos ni coloquialismos

TRANSCRIPCIÓN:
{transcripcion}

Responde con JSON: {"score": 0-10, "fraseologia": 0-10, "claridad": 0-10, "protocolo": 0-10, "formalidad": 0-10, "justification": "", "recommendations": []}"""
