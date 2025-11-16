import React, { useState, useRef, useEffect, useMemo } from 'react';
import { type AiProvider } from '../types';
import { testAiConnection } from '../services/geminiService';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const AI_MODELS = [
    { id: 'gpt-4o', displayName: 'GPT-4o', description: 'Fast, intelligent, flexible GPT model' },
    { id: 'gpt-4o-mini', displayName: 'GPT-4o mini', description: 'Fast, affordable small model for focused tasks' },
    { id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', description: 'An older high-intelligence GPT model' },
    { id: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', description: 'Legacy GPT model for cheaper chat and non-chat tasks' },
    { id: 'dall-e-3', displayName: 'DALL·E 3', description: 'Image generation model' },
    { id: 'anthropic/claude-3-haiku', displayName: 'Claude 3 Haiku (Anthropic)', description: 'Fastest and most compact model for near-instant responsiveness.' },
    { id: 'anthropic/claude-3-sonnet', displayName: 'Claude 3 Sonnet (Anthropic)', description: 'Ideal balance of intelligence and speed.' },
    { id: 'anthropic/claude-3-opus', displayName: 'Claude 3 Opus (Anthropic)', description: 'Most powerful model for highly complex tasks.' },
    { id: 'mistralai/mistral-7b-instruct-free', displayName: 'Mistral 7B Instruct (Free)', description: 'A fast and helpful model from Mistral AI.' },
    { id: 'google/gemini-pro', displayName: 'Gemini Pro (Google)', description: 'Google\'s capable multimodal model.' },
    { id: 'gpt-5', displayName: 'GPT-5', description: 'The best model for coding and agentic tasks across domains' },
    { id: 'gpt-5-mini', displayName: 'GPT-5 mini', description: 'A faster, cost-efficient version of GPT-5 for well-defined tasks' },
    { id: 'gpt-5-nano', displayName: 'GPT-5 nano', description: 'Fastest, most cost-efficient version of GPT-5' },
    { id: 'sora-2', displayName: 'Sora 2', description: 'Flagship video generation with synced audio' },
    { id: 'dall-e-2', displayName: 'DALL·E 2', description: 'An older image generation model' },
    { id: 'gpt-4', displayName: 'GPT-4', description: 'An older high-intelligence GPT model' },
    { id: 'text-embedding-3-large', displayName: 'Embedding 3 Large', description: 'Most capable embedding model' },
    { id: 'text-embedding-3-small', displayName: 'Embedding 3 Small', description: 'Small embedding model' },
    { id: 'text-embedding-ada-002', displayName: 'Embedding Ada 002', description: 'Older embedding model' },
    { id: 'tts-1', displayName: 'TTS-1', description: 'Text-to-speech model optimized for speed' },
    { id: 'tts-1-hd', displayName: 'TTS-1 HD', description: 'Text-to-speech model optimized for quality' },
];

const ChevronDownIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredModels = useMemo(() => {
        if (!searchTerm) return AI_MODELS;
        return AI_MODELS.filter(model =>
            model.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            model.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const handleSelect = (modelId: string) => {
        onChange(modelId);
        setIsOpen(false);
        inputRef.current?.blur();
    };

    const selectedModel = AI_MODELS.find(m => m.id === value);

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-3 pr-10 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                     <ChevronDownIcon />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    <ul>
                        {filteredModels.length > 0 ? filteredModels.map(model => (
                            <li
                                key={model.id}
                                onMouseDown={() => handleSelect(model.id)}
                                className={`px-4 py-2 cursor-pointer hover:bg-cyan-600 ${value === model.id ? 'bg-cyan-700' : ''}`}
                            >
                                <p className="font-semibold text-sm">{model.displayName}</p>
                                <p className="text-xs text-gray-400">{model.description}</p>
                            </li>
                        )) : (
                            <li className="px-4 py-2 text-sm text-gray-400">No models found. You can still type a custom model name.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { 
    webhookUrl: string; 
    isAutoDiscoverEnabled: boolean; 
    autoDiscoverFrequency: number; 
    aiProvider: AiProvider;
    openaiApiKey: string;
    openrouterApiKey: string;
    openaiModel: string;
    openrouterModel: string;
    isAutoNotifyEnabled: boolean;
    notifyDaysBefore: number;
    isDailyBriefingEnabled: boolean;
    dailyBriefingTime: string;
    isChineseHolidayNotificationEnabled: boolean;
    chineseHolidayNotifyDaysBefore: number;
  }) => void;
  currentWebhookUrl: string;
  isAutoDiscoverEnabled: boolean;
  autoDiscoverFrequency: number;
  currentAiProvider: AiProvider;
  currentOpenaiApiKey: string;
  currentOpenrouterApiKey: string;
  currentOpenaiModel: string;
  currentOpenrouterModel: string;
  isAutoNotifyEnabled: boolean;
  notifyDaysBefore: number;
  isDailyBriefingEnabled: boolean;
  dailyBriefingTime: string;
  isChineseHolidayNotificationEnabled: boolean;
  chineseHolidayNotifyDaysBefore: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentWebhookUrl,
  isAutoDiscoverEnabled,
  autoDiscoverFrequency,
  currentAiProvider,
  currentOpenaiApiKey,
  currentOpenrouterApiKey,
  currentOpenaiModel,
  currentOpenrouterModel,
  isAutoNotifyEnabled,
  notifyDaysBefore,
  isDailyBriefingEnabled,
  dailyBriefingTime,
  isChineseHolidayNotificationEnabled,
  chineseHolidayNotifyDaysBefore
}) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl);
  const [autoDiscover, setAutoDiscover] = useState(isAutoDiscoverEnabled);
  const [frequency, setFrequency] = useState(autoDiscoverFrequency);
  const [aiProvider, setAiProvider] = useState<AiProvider>(currentAiProvider);
  const [openaiApiKey, setOpenaiApiKey] = useState(currentOpenaiApiKey);
  const [openrouterApiKey, setOpenrouterApiKey] = useState(currentOpenrouterApiKey);
  const [openaiModel, setOpenaiModel] = useState(currentOpenaiModel);
  const [openrouterModel, setOpenrouterModel] = useState(currentOpenrouterModel);
  
  const [autoNotify, setAutoNotify] = useState(isAutoNotifyEnabled);
  const [daysBefore, setDaysBefore] = useState(notifyDaysBefore);
  const [dailyBriefing, setDailyBriefing] = useState(isDailyBriefingEnabled);
  const [briefingTime, setBriefingTime] = useState(dailyBriefingTime);
  const [chineseHolidaysNotify, setChineseHolidaysNotify] = useState(isChineseHolidayNotificationEnabled);
  const [chineseHolidaysDaysBefore, setChineseHolidaysDaysBefore] = useState(chineseHolidayNotifyDaysBefore);

  const [testStatus, setTestStatus] = useState<Record<AiProvider, TestStatus>>({
      gemini: 'idle',
      openai: 'idle',
      openrouter: 'idle'
  });

  const handleTest = async (provider: AiProvider) => {
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
    let keyToTest: string | undefined;
    if (provider === 'openai') keyToTest = openaiApiKey;
    if (provider === 'openrouter') keyToTest = openrouterApiKey;

    const result = await testAiConnection(provider, keyToTest);
    
    if (result.success) {
      setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
    } else {
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
    }
    setTimeout(() => setTestStatus(prev => ({...prev, [provider]: 'idle'})), 3000);
  };
  
  const getTestButtonText = (provider: AiProvider) => {
      switch (testStatus[provider]) {
          case 'testing': return 'Testing...';
          case 'success': return 'Success!';
          case 'error': return 'Failed!';
          default: return 'Test Connection';
      }
  };

  const getTestButtonClass = (provider: AiProvider) => {
      switch(testStatus[provider]) {
          case 'testing': return 'bg-gray-500';
          case 'success': return 'bg-green-600';
          case 'error': return 'bg-red-600';
          default: return 'bg-cyan-600 hover:bg-cyan-500';
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      webhookUrl,
      isAutoDiscoverEnabled: autoDiscover,
      autoDiscoverFrequency: Number(frequency) || 2,
      aiProvider,
      openaiApiKey,
      openrouterApiKey,
      openaiModel,
      openrouterModel,
      isAutoNotifyEnabled: autoNotify,
      notifyDaysBefore: Number(daysBefore) || 7,
      isDailyBriefingEnabled: dailyBriefing,
      dailyBriefingTime: briefingTime,
      isChineseHolidayNotificationEnabled: chineseHolidaysNotify,
      chineseHolidayNotifyDaysBefore: Number(chineseHolidaysDaysBefore) || 30,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-gray-800/80 backdrop-blur-lg animate-slideInUp rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700/50 text-white" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700/50">
          <h3 className="text-lg font-bold">Settings</h3>
          <p className="text-sm text-gray-400">Configure application settings</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* --- AI Configuration --- */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-200">AI Configuration</h4>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-700/80 rounded-lg">
                {(['gemini', 'openai', 'openrouter'] as AiProvider[]).map(p => (
                    <button type="button" key={p} onClick={() => setAiProvider(p)} className={`px-3 py-2 text-sm font-semibold rounded-md capitalize transition-colors duration-200 ${aiProvider === p ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-300 hover:bg-black/20'}`}>
                        {p}
                    </button>
                ))}
            </div>
            
            <div className="p-4 bg-gray-900/50 rounded-md space-y-4">
                {aiProvider === 'gemini' && (
                    <div className="animate-fadeIn">
                        <p className="text-sm text-gray-300">Uses the built-in Google Gemini model. The API key is configured on the server by the host.</p>
                         <button type="button" onClick={() => handleTest('gemini')} className={`mt-2 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 ${getTestButtonClass('gemini')}`}>
                            {getTestButtonText('gemini')}
                        </button>
                    </div>
                )}
                {aiProvider === 'openai' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div>
                            <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-300 mb-1">OpenAI API Key</label>
                            <div className="flex items-center space-x-2">
                               <input type="password" id="openaiApiKey" value={openaiApiKey} onChange={e => setOpenaiApiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"/>
                               <button type="button" onClick={() => handleTest('openai')} disabled={!openaiApiKey} className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed ${getTestButtonClass('openai')}`}>
                                   {getTestButtonText('openai')}
                               </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="openaiModel" className="block text-sm font-medium text-gray-300 mb-1">OpenAI Model Name</label>
                            <ModelSelector value={openaiModel} onChange={setOpenaiModel} placeholder="e.g., gpt-4o"/>
                        </div>
                    </div>
                )}
                {aiProvider === 'openrouter' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div>
                            <label htmlFor="openrouterApiKey" className="block text-sm font-medium text-gray-300 mb-1">OpenRouter API Key</label>
                            <div className="flex items-center space-x-2">
                               <input type="password" id="openrouterApiKey" value={openrouterApiKey} onChange={e => setOpenrouterApiKey(e.target.value)} placeholder="sk-or-..." className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"/>
                               <button type="button" onClick={() => handleTest('openrouter')} disabled={!openrouterApiKey} className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed ${getTestButtonClass('openrouter')}`}>
                                  {getTestButtonText('openrouter')}
                               </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="openrouterModel" className="block text-sm font-medium text-gray-300 mb-1">OpenRouter Model Name</label>
                            <ModelSelector value={openrouterModel} onChange={setOpenrouterModel} placeholder="e.g., anthropic/claude-3-haiku"/>
                            <p className="mt-2 text-xs text-gray-400">Find model names on the <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">OpenRouter Models page</a>.</p>
                        </div>
                    </div>
                )}
            </div>
          </div>
          
          {/* --- Integrations --- */}
          <div>
            <h4 className="text-md font-medium text-gray-200 mb-2">Integrations</h4>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-300 mb-1">Discord Webhook URL</label>
            <input type="url" id="webhookUrl" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200" aria-describedby="webhook-description"/>
            <p id="webhook-description" className="mt-2 text-xs text-gray-400">This allows the app to send automated notifications and summaries directly to your Discord channel.</p>
          </div>

          {/* --- Automated Notifications --- */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-200">Automated Notifications</h4>
            <div className="p-4 bg-gray-900/50 rounded-md space-y-4">
                <div>
                    <label htmlFor="daily-briefing-toggle" className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md cursor-pointer">
                       <span className="text-sm font-medium text-gray-300 pr-4">Enable Daily Briefing</span>
                       <div className="relative inline-flex items-center">
                           <input type="checkbox" id="daily-briefing-toggle" checked={dailyBriefing} onChange={e => setDailyBriefing(e.target.checked)} className="sr-only peer" />
                           <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                       </div>
                   </label>
                   <p className="mt-2 text-xs text-gray-400 px-1">Sends a summary of today's events to your Discord channel every morning, including an AI-powered marketing tip.</p>
                </div>
                
                <div className="border-t border-gray-700/50 !mt-4 !mb-4"></div>

                <div>
                    <label htmlFor="auto-notify-toggle" className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md cursor-pointer">
                        <span className="text-sm font-medium text-gray-300 pr-4">Enable Upcoming Event Reminders</span>
                        <div className="relative inline-flex items-center">
                           <input type="checkbox" id="auto-notify-toggle" checked={autoNotify} onChange={e => setAutoNotify(e.target.checked)} className="sr-only peer" />
                           <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                       </div>
                    </label>
                    {autoNotify && (
                       <div className="mt-3 animate-fadeIn px-1">
                         <label htmlFor="notify-days" className="block text-sm font-medium text-gray-300 mb-1">Send reminder (days before)</label>
                         <input type="number" id="notify-days" value={daysBefore} onChange={e => setDaysBefore(parseInt(e.target.value, 10))} min="1" className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200" aria-describedby="notify-days-description"/>
                         <p id="notify-days-description" className="mt-2 text-xs text-gray-400">A reminder will be sent to Discord this many days before each event is scheduled.</p>
                       </div>
                    )}
                </div>

                {(dailyBriefing || autoNotify) && (
                    <>
                        <div className="border-t border-gray-700/50 !mt-4 !mb-4"></div>
                        <div className="animate-fadeIn px-1">
                            <label htmlFor="briefing-time" className="block text-sm font-medium text-gray-300 mb-1">Daily Notification Time</label>
                            <input type="time" id="briefing-time" value={briefingTime} onChange={e => setBriefingTime(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200" aria-describedby="briefing-time-description"/>
                            <p id="briefing-time-description" className="mt-2 text-xs text-gray-400">The time of day (in UAE timezone) when briefings and reminders will be sent to Discord.</p>
                        </div>
                    </>
                )}
            </div>
          </div>
          
          {/* --- Holiday Specific Notifications --- */}
           <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-200">Holiday Specific Notifications</h4>
            <div className="p-4 bg-gray-900/50 rounded-md space-y-4">
                 <div>
                    <label htmlFor="chinese-holiday-toggle" className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md cursor-pointer">
                        <span className="text-sm font-medium text-gray-300 pr-4">Enable Chinese Holiday Reminders</span>
                        <div className="relative inline-flex items-center">
                           <input type="checkbox" id="chinese-holiday-toggle" checked={chineseHolidaysNotify} onChange={e => setChineseHolidaysNotify(e.target.checked)} className="sr-only peer" />
                           <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                       </div>
                    </label>
                    {chineseHolidaysNotify && (
                       <div className="mt-3 animate-fadeIn px-1">
                         <label htmlFor="chinese-notify-days" className="block text-sm font-medium text-gray-300 mb-1">Notify (days before)</label>
                         <input type="number" id="chinese-notify-days" value={chineseHolidaysDaysBefore} onChange={e => setChineseHolidaysDaysBefore(parseInt(e.target.value, 10))} min="1" className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200" aria-describedby="chinese-notify-days-description"/>
                         <p id="chinese-notify-days-description" className="mt-2 text-xs text-gray-400">Sends a reminder for upcoming Chinese holidays.</p>
                       </div>
                    )}
                </div>
            </div>
          </div>

          {/* --- Automated Discovery --- */}
          <div className="space-y-4">
             <h4 className="text-md font-medium text-gray-200">Automated Event Discovery</h4>
             <label htmlFor="auto-discover-toggle-input" className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md cursor-pointer">
                <span className="text-sm font-medium text-gray-300 pr-4">
                  Enable automatic background search
                </span>
                <div className="relative inline-flex items-center">
                    <input type="checkbox" id="auto-discover-toggle-input" checked={autoDiscover} onChange={e => setAutoDiscover(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </div>
            </label>
             {autoDiscover && (
                <div className="animate-fadeIn px-1">
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-300 mb-1">Run discovery every (days)</label>
                  <input type="number" id="frequency" value={frequency} onChange={e => setFrequency(parseInt(e.target.value, 10))} min="1" className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200" aria-describedby="frequency-description"/>
                  <p id="frequency-description" className="mt-2 text-xs text-gray-400">The server will automatically check for new events. If any are found, a notification will be sent to your Discord channel.</p>
                </div>
              )}
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/80 rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-all duration-200 transform hover:scale-105 active:scale-95">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};
