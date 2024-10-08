const USE_LOCAL_RELAY_SERVER_URL: string | undefined = void 0;

import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';

import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { WavRenderer } from '../utils/wav_renderer';

import { X, Edit, Zap } from 'react-feather';
import { Button } from '../components/button/Button';

import './VoiceChat.scss';

export const VoiceChat = () => {
  const apiKey = USE_LOCAL_RELAY_SERVER_URL
    ? ''
    : localStorage.getItem('tmp::voice_api_key') ||
      prompt('OpenAI API Key') ||
      '';
  if (apiKey !== '') {
    localStorage.setItem('tmp::voice_api_key', apiKey);
  }

  const instructions = `System settings:
Tool use: enabled.

Instructions:
- You are an artificial intelligence agent Assistan responsible for helping test realtime voice capabilities
- You will greet and ask about appointment if they want to book an appointment first ask their Name when you hear name then forward to 
next question ask their Email if you hear email then forward to next question ask their Mobile number, ask their timing for appointment and then ask the date for appointment and after all get confirmed that they are available then automatically sent the google meet invite link on their email id.
- Please make sure to respond with a helpful voice via audio
- Be kind, helpful, and curteous
- It is okay to ask the user questions
- Use tools and functions you have available liberally, it is part of the training apparatus
- Be open to exploration and conversation
- Remember: this is just for fun and testing!

Personality:
- Be upbeat and genuine
- Try speaking quickly as if excited
`;

  /**
   *- You will ask questions what is your buiness and according to buiness ask questions to add the fields in schema by tool calling save_dynamic_data

   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      USE_LOCAL_RELAY_SERVER_URL
        ? { url: USE_LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  /**
   * References for
   * - Rendering audio visualization (canvas)
   * - Autoscrolling event logs
   * - Timing delta for event log displays
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  const [items, setItems] = useState<ItemType[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const resetAPIKey = useCallback(() => {
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  /**
   * Connect to conversation:
   * WavRecorder takes speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setItems(client.conversation.getItems());

    // Connect to microphone
    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Greet as you are a voice assistant`, // Can change this initial text
      },
    ]);

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  /**
   * Switch between Manual <> VAD mode for communication
   */
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });
    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  };

  /**
   * Auto-scroll the conversation logs
   */
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]')
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  /**
   * Set up render loops for the visualization canvas
   */
  useEffect(() => {
    let isLoaded = true;

    changeTurnEndType('server_vad');

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#fff700',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  let userId = '';
  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    client.updateSession({ instructions: instructions });
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    client.addTool(
      {
        name: 'save_name',
        description: "Saves the user's name to the database.",
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'User name to save',
            },
          },
          required: ['name'],
        },
      },
      async ({ name }: { name: string }) => {
        try {
          console.log('Saving name:', name);
          const response = await axios.post(
            'http://localhost:3001/save-name',
            { name },
            { withCredentials: true } // Ensure that your server supports CORS and handles credentials correctly
          );
    
          console.log('Response data:', response.data);
          console.log('Response status:', response.status); // Changed to response.status to get the status code
          userId = response.data.userId;
          return response.data;
        } catch (error) {
          // Check if the error is an AxiosError
          if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.response?.data || error.message);
          } else {
            console.error('Failed to save name:', error);
          }
          throw error; // Important to propagate the error
        }
      }
    );
    client.addTool(
      {
        name: 'save_email',
        description: "Saves the user's email to the database.",
        parameters: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email to save',
            },
          },
          required: ['email'],
        },
      },
      async ({ email }: { email: string }) => {
        if (!userId) {
          throw new Error('User ID is not available. Please save the name first.');
        }
    
        try {
          console.log('Saving email:', email, 'for userId:', userId);
    
          // Use Axios to send the POST request
          const response = await axios.post('http://localhost:3001/save-email', {
            email,
            userId, // Use the stored userId
          }, { withCredentials: true }); // Include credentials if needed
    
          console.log('Email save response:', response.data); // Log response for debugging
          return response.data; // Return the response data
        } catch (error) {
          console.error('Failed to save email:', error);
          throw error; // Propagate the error for further handling
        }
      }
    );
    
    // Tool to save mobile number
client.addTool(
  {
    name: 'save_mobile',
    description: "Saves the user's mobile number to the database.",
    parameters: {
      type: 'object',
      properties: {
        mobile: {
          type: 'string',
          description: 'User mobile number to save',
        },
      },
      required: ['mobile'],
    },
  },
  async ({ mobile }: { mobile: string }) => {
    if (!userId) {
      throw new Error('User ID is not available. Please save the name first.');
    }

    try {
      console.log('Saving mobile:', mobile, 'for userId:', userId);

      const response = await axios.post('http://localhost:3001/save-mobile', {
        mobile,
        userId, // Use the stored userId
      }, { withCredentials: true }); // Include credentials if needed

      console.log('Mobile save response:', response.data); // Log response for debugging
      return response.data; // Return the response data
    } catch (error) {
      console.error('Failed to save mobile:', error);
      throw error; // Propagate the error for further handling
    }
  }
);

// Tool to save preferred time
client.addTool(
  {
    name: 'save_time',
    description: "Saves the user's preferred time to the database.",
    parameters: {
      type: 'object',
      properties: {
        time: {
          type: 'string',
          description: 'User preferred time to save',
        },
      },
      required: ['time'],
    },
  },
  async ({ time }: { time: string }) => {
    if (!userId) {
      throw new Error('User ID is not available. Please save the name first.');
    }

    try {
      console.log('Saving time:', time, 'for userId:', userId);

      const response = await axios.post('http://localhost:3001/save-time', {
        time,
        userId, 
      }, { withCredentials: true }); 

      console.log('Time save response:', response.data); // Log response for debugging
      return response.data; // Return the response data
    } catch (error) {
      console.error('Failed to save time:', error);
      throw error; 
    }
  }
);

client.addTool(
  {
    name: 'save_date',
    description: "Saves the user's preferred date to the database.",
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'User preferred date to save (format: YYYY-MM-DD)',
        },
      },
      required: ['date'],
    },
  },
  async ({ date }: { date: string }) => {
    if (!userId) {
      throw new Error('User ID is not available. Please save the name first.');
    }

    try {
      console.log('Saving date:', date, 'for userId:', userId);

      const response = await axios.post('http://localhost:3001/save-date', {
        date,
        userId, // Use the stored userId
      }, { withCredentials: true }); // Include credentials if needed

      console.log('Date save response:', response.data); // Log response for debugging
      return response.data; // Return the response data
    } catch (error) {
      console.error('Failed to save date:', error);
      throw error; // Propagate the error for further handling
    }
  }
);

// client.addTool(
//   {
//     name: 'save_dynamic_data',
//     description: "Saves dynamic user data to the database.",
//     parameters: {
//       type: 'object',
//       properties: {
//         businessType: {
//           type: 'string',
//           description: "Type of business (e.g., Real Estate, Flight Ticket)",
//         },
//         fields: {
//           type: 'object',
//           description: "Dynamic fields based on user input and Adjust type as needed (could be string, number, etc.)",
//           additionalProperties: {
//             type: 'string', // Adjust type as needed (could be string, number, etc.)
//           },
//         },
//       },
//       required: ['businessType', 'fields'],
//     },
//   },
//   async ({ businessType, fields }: { businessType: string; fields: any }) => {

//     try {
//       console.log('Saving dynamic data:', businessType, fields);
//       const response = await axios.post('http://localhost:3001/business', {
//         businessType,
//         fields,
//       }, { withCredentials: true });

//       console.log('Dynamic data save response:', response.data); // Log response for debugging
//       return response.data; // Return the response data
//     } catch (error) {
//       console.error('Failed to save dynamic data:', error);
//       throw error;
//     }
//   }
// );

      

    client.updateSession({ voice: 'alloy' });

    client.on('error', (event: any) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, []);


  return (
    <div data-component="VoiceChat">
      <div className="content-top">
        <div className="content-title">
          <span>AI Voice Agent</span>
        </div>
        <div className="content-api-key">
          {!USE_LOCAL_RELAY_SERVER_URL && (
            <Button
              icon={Edit}
              iconPosition="end"
              buttonStyle="flush"
              label={`api key: ${apiKey.slice(0, 3)}...`}
              onClick={() => resetAPIKey()}
            />
          )}
        </div>
      </div>
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <div className="visualization">
              <div className="visualization-entry client">
                <canvas ref={clientCanvasRef} />
              </div>
              <div className="visualization-entry server">
                <canvas ref={serverCanvasRef} />
              </div>
            </div>
          </div>
          {items.length > 0 && (
            <div className="content-block conversation">
              <div className="content-block-body" data-conversation-content>
                {items.map((conversationItem, i) => {
                  return (
                    <div
                      className="conversation-item"
                      key={conversationItem.id}
                    >
                      <div className={`speaker ${conversationItem.role || ''}`}>
                        <div>
                          {(
                            conversationItem.role || conversationItem.type
                          ).replaceAll('_', ' ')}
                        </div>
                        <div
                          className="close"
                          onClick={() =>
                            deleteConversationItem(conversationItem.id)
                          }
                        >
                          <X />
                        </div>
                      </div>
                      <div className={`speaker-content`}>
                        {!conversationItem.formatted.tool &&
                          conversationItem.role === 'user' && (
                            <div>
                              {conversationItem.formatted.transcript ||
                                (conversationItem.formatted.audio?.length
                                  ? '(awaiting transcript)'
                                  : conversationItem.formatted.text ||
                                    '(item sent)')}
                            </div>
                          )}
                        {!conversationItem.formatted.tool &&
                          conversationItem.role === 'assistant' && (
                            <div>
                              {conversationItem.formatted.transcript ||
                                conversationItem.formatted.text ||
                                '(truncated)'}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="content-actions">
            <Button
              label={isConnected ? 'Disconnect' : 'Connect'}
              iconPosition={isConnected ? 'end' : 'start'}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? 'regular' : 'action'}
              onClick={
                isConnected ? disconnectConversation : connectConversation
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
