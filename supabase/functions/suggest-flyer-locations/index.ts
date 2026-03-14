const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, neighborhood, eventTitle } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ success: false, error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a food access expert for New York City. Given an event location, suggest 5 optimal locations where volunteers should post flyers about free food resources to maximize community impact.

EVENT LOCATION:
- Coordinates: ${latitude}, ${longitude}
- Neighborhood: ${neighborhood || 'Unknown'}
- Event: ${eventTitle || 'Free food distribution'}

CRITERIA FOR SUGGESTIONS:
1. Prioritize USDA-designated food desert areas (low-income census tracts where a substantial number of residents have limited access to a supermarket or large grocery store)
2. Target high foot-traffic areas: subway stations, bus stops, laundromats, bodegas, community centers, libraries, clinics, shelters
3. Each suggestion should be within 2 miles of the event location
4. Avoid areas that already have high food resource density
5. Consider areas with high populations of elderly, families with children, or immigrant communities who may benefit most

RESPOND WITH EXACTLY THIS JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "suggestions": [
    {
      "name": "Short descriptive name of the location",
      "address": "Approximate street address or intersection",
      "latitude": 40.xxx,
      "longitude": -73.xxx,
      "reason": "Brief explanation of why this is a high-impact location (mention food desert status, demographics, foot traffic)",
      "impact_score": 85,
      "type": "subway_station|community_center|commercial_strip|residential_area|transit_hub|shelter|library|clinic"
    }
  ]
}

Make sure all coordinates are realistic NYC coordinates near the event location. Impact score is 0-100.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI request failed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse the JSON from the AI response
    let suggestions;
    try {
      // Try to extract JSON if wrapped in code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
