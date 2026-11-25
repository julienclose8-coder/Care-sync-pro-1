import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const CATEGORIES = ['general', 'support', 'progress', 'medication', 'observation', 'behavioural', 'moods', 'locked_concern'];

const CATEGORY_GUIDE = {
  general: 'General note — record any general care information.',
  support: 'Support note — record the personal care and supports provided during the shift. Ask about which allocated supports were delivered (for example personal care, domestic assistance, community access), how the client responded, any difficulties, and the outcome. The client\'s support needs and any vulnerabilities are in their file.',
  progress: 'Progress note — record progress toward the client\'s goals and overall development. Ask about what progress was observed, which goals were worked on, new achievements, and any setbacks.',
  medication: 'Medication note — record medication given or observed. The client\'s medication administration guidelines are in their file. First ask whether this is a planned medication (per the guidelines), an unplanned/PRN medication such as a painkiller, or medication observed being taken. Then ask which medication, the dose, the time, the route, whether it was administered or observed, the client\'s response, and any refusal or side effects. Reference the client\'s prescribed medications from their file where relevant.',
  observation: 'Observation note — record objective observations. Ask about what was observed (physical, emotional, behavioural or environmental), the time and context, and why it is notable.',
  behavioural: 'Behavioural note — record the behaviour. Ask about the behaviour itself, what happened before it (the antecedent), the context, how staff responded, and the outcome.',
  moods: 'Mood note — record the client\'s mood and affect. Ask about the client\'s overall mood, energy level, affect, any triggers or changes during the shift, and how it compared to their usual baseline.',
  locked_concern: 'Locked note of concern — record a private concern. This note is private to the author. Ask about the nature of the concern, who was involved, when it occurred, any immediate action taken, who it was reported to, and any follow-up needed.',
};

function buildContext(client, shift, category, subtype) {
  const lines = [];
  if (client) {
    lines.push(`Client: ${client.full_name || ''}`);
    if (client.disability_info) lines.push(`Disability/care context: ${client.disability_info}`);
    if (category === 'medication' && client.medication_info) lines.push(`Medication administration guidelines: ${client.medication_info}`);
    if (client.support_needs) lines.push(`Support needs: ${client.support_needs}`);
    if (client.plan_instructions) lines.push(`Support plan instructions: ${client.plan_instructions}`);
    if (client.preferences) lines.push(`Preferences: ${client.preferences}`);
  }
  if (shift) {
    lines.push(`Shift: ${shift.date || ''} ${shift.start_time || ''} to ${shift.end_time || ''}, ${shift.service_type || 'Support'}`);
  }
  if (category === 'behavioural' && subtype) lines.push(`Behaviour subtype: ${subtype}`);
  return lines.join('\n');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { action, category, behavioural_subtype, client_id, shift_id, messages } = body;

    if (!['ask', 'compile'].includes(action)) return Response.json({ error: 'Choose a valid assistant action.' }, { status: 400 });
    if (!CATEGORIES.includes(category)) return Response.json({ error: 'Choose a note category.' }, { status: 400 });
    if (category === 'behavioural' && behavioural_subtype && !['positive', 'negative'].includes(behavioural_subtype)) return Response.json({ error: 'Choose a valid behaviour subtype.' }, { status: 400 });
    if (typeof client_id !== 'string' || !client_id || client_id.length > 100) return Response.json({ error: 'Choose a client.' }, { status: 400 });

    // Access check — same gate as the care notes function.
    const admin = user.role === 'admin';
    const service = base44.asServiceRole.entities;
    const client = await base44.entities.Client.get(client_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!client) return Response.json({ error: 'Client not found.' }, { status: 404 });
    if (!admin) {
      const [shifts, team] = await Promise.all([
        service.Shift.filter({ client_id, worker_id: user.id }, '-date', 1),
        service.SupportTeamMember.filter({ client_id, worker_id: user.id, status: 'approved' }, '-created_date', 1),
      ]);
      if (!shifts.length && !team.length) return Response.json({ error: 'Notes are available only for your assigned clients.' }, { status: 403 });
    }
    let shift = null;
    if (shift_id) {
      shift = await service.Shift.get(shift_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!shift || shift.client_id !== client_id || (!admin && shift.worker_id !== user.id)) return Response.json({ error: 'This support is not assigned to you for this client.' }, { status: 403 });
    }

    const history = Array.isArray(messages)
      ? messages.filter((m) => m && typeof m.text === 'string' && ['assistant', 'user'].includes(m.role)).slice(-20)
      : [];
    const contextBlock = buildContext(client, shift, category, behavioural_subtype);
    const guide = CATEGORY_GUIDE[category] || CATEGORY_GUIDE.general;
    const role = user.role === 'admin' ? 'a manager' : 'a support worker';

    if (action === 'ask') {
      const transcript = history.length
        ? history.map((m) => `${m.role === 'assistant' ? 'Assistant' : 'Support worker'}: ${m.text}`).join('\n')
        : '(no answers yet)';
      const prompt = `You are a professional care notes assistant helping ${role} write a ${category.replace('_', ' ')} note for an Australian disability and community support service. You ask ONE clear question at a time to gather enough information to write the note. Never ask more than one question at once. Keep each question short, plain and specific to the worker's situation.\n\nNote category guidance:\n${guide}\n\nClient and shift context (from their file):\n${contextBlock}\n\nConversation so far:\n${transcript}\n\nDecide whether you already have enough information to write a complete, professional note. If yes, set "complete" to true and leave "question" empty. If not, set "complete" to false and provide the next single question in "question". Set "topic" to a short label for what the question is about (e.g. "Medication type", "Client response").`;
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: { question: { type: 'string' }, complete: { type: 'boolean' }, topic: { type: 'string' } },
          required: ['question', 'complete'],
        },
      });
      return Response.json({ question: result.question || '', complete: !!result.complete, topic: result.topic || '' });
    }

    // compile
    if (!history.length || history.filter((m) => m.role === 'user').length === 0) {
      return Response.json({ error: 'Answer at least one question before generating the note.' }, { status: 400 });
    }
    const transcript = history.map((m) => `${m.role === 'assistant' ? 'Assistant' : 'Support worker'}: ${m.text}`).join('\n');
    const subtypeClause = category === 'behavioural' && behavioural_subtype ? `Begin the note by noting this is a ${behavioural_subtype} behaviour. ` : '';
    const prompt = `You are a professional care notes assistant. Using the support worker's answers below, write a complete, professional ${category.replace('_', ' ')} note for an Australian disability and community support service. Write in the past tense, be factual and objective, use clear sentences, and include only what the worker reported. Do not speculate, do not give medical advice, and do not invent details that were not provided. ${subtypeClause}Keep it concise (usually 3 to 6 sentences).\n\nNote category guidance:\n${guide}\n\nClient and shift context (from their file):\n${contextBlock}\n\nConversation:\n${transcript}\n\nWrite the finished note now. Output only the note text.`;
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] },
    });
    return Response.json({ content: result.content || '' });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to generate the note. Please try again.' }, { status: 500 });
  }
}