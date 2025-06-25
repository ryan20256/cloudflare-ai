import HTML from './index.html';

export default {
  async fetch(request, env) {
    const originalHost = request.headers.get("host");
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    if (path === '/logo.png') {
      return env.ASSETS.fetch(request);
    }
    if (request.method === 'POST') {
      const data = await request.json();
      let model = '@cf/lykon/dreamshaper-8-lcm';

      if ('prompt' in data && 'model' in data) {
        switch(data.model) {
          case 'dreamshaper-8-lcm':
            model = '@cf/lykon/dreamshaper-8-lcm';
            break;
          case 'stable-diffusion-xl-base-1.0':
            model = '@cf/stabilityai/stable-diffusion-xl-base-1.0';
            break;
          case 'stable-diffusion-xl-lightning':
            model = '@cf/bytedance/stable-diffusion-xl-lightning';
            break;
          case 'flux-1-schnell':
            model = '@cf/black-forest-labs/flux-1-schnell';
            break;
          case 'stable-diffusion-v1-5-img2img':
            model = '@cf/runwayml/stable-diffusion-v1-5-img2img';
            break;
          case 'stable-diffusion-v1-5-inpainting':
            model = '@cf/runwayml/stable-diffusion-v1-5-inpainting';
            break;
          default:
            break;
        }

        const noSizeSupportModels = ['@cf/black-forest-labs/flux-1-schnell'];
        const noNegativePromptModels = ['@cf/black-forest-labs/flux-1-schnell'];
        const noGuidanceSupportModels = ['@cf/black-forest-labs/flux-1-schnell'];

        const inputs = {
          prompt: data.prompt,
        };

        if (data.negative_prompt && !noNegativePromptModels.includes(model)) {
          inputs.negative_prompt = data.negative_prompt;
        }
        
        if (!noSizeSupportModels.includes(model)) {
          if (data.width) inputs.width = parseInt(data.width);
          if (data.height) inputs.height = parseInt(data.height);
        }

        if (!noGuidanceSupportModels.includes(model) && data.guidance) {
          inputs.guidance = parseFloat(data.guidance);
        }

        try {
          console.log(`Running model ${model} with inputs:`, inputs);
          const response = await env.AI.run(model, inputs);

          if (!response || response.length === 0) {
            throw new Error('AI模型返回了空数据');
          }
          
          if (model.includes('flux-1-schnell')) {
            console.log('Processing flux-1-schnell model response');
            if (response.image) {
              const binaryString = atob(response.image);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              return new Response(bytes, {
                headers: {
                  ...corsHeaders, 
                  'content-type': 'image/jpeg',
                  'cache-control': 'no-cache, no-store, must-revalidate'
                },
              });
            } else {
              throw new Error('flux-1-schnell模型未返回有效的图像数据');
            }
          } else {
            return new Response(response, {
              headers: {
                ...corsHeaders, 
                'content-type': 'image/png',
                'cache-control': 'no-cache, no-store, must-revalidate'
              },
            });
          }
        } catch (error) {
          console.error(`AI模型运行错误: ${error.message}`);
          return new Response(`生成图像时出错: ${error.message}`, { 
            status: 500, 
            headers: corsHeaders 
          });
        }
      } else {
        return new Response('Missing prompt or model', { status: 400, headers: corsHeaders });
      }
    } else {
      return new Response(HTML.replace(/{{host}}/g, originalHost), {
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": "text/html"
        }
      });
    }
  }
};