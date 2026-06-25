import OpenAI from 'openai';

export function createOpenAIClient({ apiKey, baseURL, organization, project } = {}) {
  const resolvedApiKey = apiKey || process.env.OPENAI_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('Missing OpenAI API key. Add OPENAI_API_KEY to .env or enter a UI key.');
  }

  return new OpenAI({
    apiKey: resolvedApiKey,
    baseURL: baseURL || process.env.OPENAI_BASE_URL || undefined,
    organization: organization || process.env.OPENAI_ORG_ID || undefined,
    project: project || process.env.OPENAI_PROJECT_ID || undefined
  });
}

export async function callModelText({
  client,
  apiMode = 'responses',
  model,
  messages,
  temperature = 0.2,
  maxOutputTokens = 1400,
  metadata
}) {
  const resolvedMessages = messages.map((message) => ({
    role: message.role === 'developer' ? 'system' : message.role,
    content: String(message.content ?? '')
  }));

  if (apiMode === 'chat') {
    return callChatCompletions({
      client,
      model,
      messages: resolvedMessages,
      temperature,
      maxOutputTokens,
      metadata
    });
  }

  try {
    const response = await client.responses.create({
      model,
      input: messages,
      temperature,
      max_output_tokens: maxOutputTokens,
      metadata
    });

    return {
      text: extractResponsesText(response),
      raw: response,
      usage: response.usage,
      apiMode: 'responses',
      requestId: response._request_id
    };
  } catch (error) {
    if (apiMode !== 'responses') throw error;

    const fallback = await callChatCompletions({
      client,
      model,
      messages: resolvedMessages,
      temperature,
      maxOutputTokens,
      metadata
    });

    return {
      ...fallback,
      apiMode: 'chat-fallback',
      fallbackReason: readableError(error)
    };
  }
}

async function callChatCompletions({ client, model, messages, temperature, maxOutputTokens, metadata }) {
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_completion_tokens: maxOutputTokens,
    metadata
  });

  return {
    text: response.choices?.[0]?.message?.content ?? '',
    raw: response,
    usage: response.usage,
    apiMode: 'chat',
    requestId: response._request_id
  };
}

function extractResponsesText(response) {
  if (response.output_text) return response.output_text;

  const chunks = [];
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
      if (content.type === 'text' && content.text) chunks.push(content.text);
    }
  }

  return chunks.join('\n').trim();
}

function readableError(error) {
  return error?.message || String(error);
}
