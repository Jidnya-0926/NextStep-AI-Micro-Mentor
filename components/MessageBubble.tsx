
import React from 'react';
import { Message, AgentHandoffData } from '../types';
import RoadmapWidget from './RoadmapWidget';
import CourseWidget from './CourseWidget';

interface MessageBubbleProps {
  message: Message;
  onHandoff?: (prompt: string) => void;
}

// --- Markdown Rendering Logic ---

const parseInline = (text: string): React.ReactNode[] => {
  // 1. Split by <br> tags to handle line breaks in tables or text
  const brSegments = text.split(/<br\s*\/?>/gi);
  const nodes: React.ReactNode[] = [];

  brSegments.forEach((segment, i) => {
    if (i > 0) nodes.push(<br key={`br-${i}`} />);

    // 2. Split by bold syntax (**text**)
    const boldSegments = segment.split(/(\*\*.*?\*\*)/g);
    
    boldSegments.forEach((boldSeg, j) => {
      if (boldSeg.startsWith('**') && boldSeg.endsWith('**')) {
        nodes.push(<strong key={`b-${i}-${j}`} className="font-bold text-slate-900 dark:text-white">{boldSeg.slice(2, -2)}</strong>);
      } else {
        // 3. Split by URL regex to auto-link
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const linkSegments = boldSeg.split(urlRegex);
        
        linkSegments.forEach((linkSeg, k) => {
            if (linkSeg.match(/^https?:\/\//)) {
                 nodes.push(
                   <a 
                     key={`l-${i}-${j}-${k}`} 
                     href={linkSeg} 
                     target="_blank" 
                     rel="noreferrer" 
                     className="text-primary hover:text-indigo-700 hover:underline break-all font-medium"
                   >
                     {linkSeg}
                   </a>
                 );
            } else {
                nodes.push(<span key={`t-${i}-${j}-${k}`}>{linkSeg}</span>);
            }
        });
      }
    });
  });

  return nodes;
};

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let listBuffer: React.ReactNode[] = [];
  let inList = false;

  let tableBuffer: string[] = [];
  let inTable = false;
  
  let codeBuffer: string[] = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (inList && listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 mb-4 space-y-2 text-slate-800 dark:text-slate-300 marker:text-primary">
          {[...listBuffer]}
        </ul>
      );
      listBuffer = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableBuffer.length > 0) {
      // Parse table buffer
      const rows = tableBuffer.map(row => {
          const cells = row.split('|');
          if (row.trim().startsWith('|') && cells[0].trim() === '') cells.shift();
          if (row.trim().endsWith('|') && cells[cells.length-1].trim() === '') cells.pop();
          return cells.map(c => c.trim());
      });

      if (rows.length >= 2) {
          const separatorIdx = rows.findIndex(row => row.every(cell => /^[:\-\s]+$/.test(cell) && cell.includes('-')));
          
          if (separatorIdx !== -1) {
              const headers = rows[0];
              const bodyRows = rows.slice(separatorIdx + 1);

              elements.push(
                <div key={`tbl-container-${elements.length}`} className="overflow-x-auto my-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900/40">
                  <table className="w-full text-sm text-left text-slate-800 dark:text-slate-300 border-collapse">
                    <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
                      <tr>
                        {headers.map((header, hIdx) => (
                          <th key={hIdx} className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 font-bold tracking-wider whitespace-nowrap">
                            {parseInline(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {bodyRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-6 py-4 align-top leading-relaxed min-w-[150px]">
                              {parseInline(cell)}
                            </td>
                          ))}
                          {Array.from({ length: Math.max(0, headers.length - row.length) }).map((_, i) => (
                             <td key={`empty-${rIdx}-${i}`} className="px-6 py-4"></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
          } else {
              tableBuffer.forEach((line, i) => {
                 elements.push(<p key={`tbl-fallback-${elements.length}-${i}`} className="text-slate-800 dark:text-slate-300 font-mono text-xs mb-1">{line}</p>);
              });
          }
      } else {
         tableBuffer.forEach((line, i) => {
             elements.push(<p key={`tbl-fallback-short-${elements.length}-${i}`} className="text-slate-800 dark:text-slate-300">{line}</p>);
         });
      }

      tableBuffer = [];
      inTable = false;
    }
  };

  const flushCodeBlock = () => {
    if (codeBuffer.length > 0) {
      elements.push(
        <div key={`code-${elements.length}`} className="my-5 rounded-lg bg-[#0d1117] border border-slate-800 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">CODE</span>
          </div>
          <div className="overflow-x-auto p-4 custom-scrollbar">
             <pre className="font-mono text-xs text-slate-300 whitespace-pre leading-relaxed">
               {codeBuffer.join('\n')}
             </pre>
          </div>
        </div>
      );
      codeBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- Code Block Logic ---
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        flushCodeBlock();
      } else {
        // Start of code block
        flushList();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // --- Table Logic ---
    if (trimmed.startsWith('|')) {
      flushList();
      inTable = true;
      tableBuffer.push(trimmed);
      continue;
    } 
    
    // Handle "gapped" tables
    if (inTable && !trimmed) {
      let tableContinues = false;
      for(let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed) {
          if (nextTrimmed.startsWith('|')) tableContinues = true;
          break;
        }
      }
      if (tableContinues) {
        continue;
      }
    }

    flushTable();

    // --- Header Logic ---
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-slate-900 dark:text-blue-200 mt-6 mb-3 tracking-tight flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
          {parseInline(trimmed.replace(/^###\s+/, ''))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
          {parseInline(trimmed.replace(/^##\s+/, ''))}
        </h2>
      );
      continue;
    }

    // --- List Logic ---
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      inList = true;
      listBuffer.push(
        <li key={`li-${i}`} className="pl-1 leading-relaxed text-slate-700 dark:text-slate-300">
          {parseInline(trimmed.replace(/^[*|-]\s+/, ''))}
        </li>
      );
      continue;
    }
    
    if (/^\d+\.\s/.test(trimmed)) {
       flushList();
       elements.push(
         <div key={`num-${i}`} className="mb-2 text-slate-800 dark:text-slate-300 flex gap-3 leading-relaxed">
           <span className="font-bold text-primary dark:text-primary min-w-[20px] text-right">{trimmed.split(' ')[0]}</span>
           <span>{parseInline(trimmed.replace(/^\d+\.\s/, ''))}</span>
         </div>
       );
       continue;
    }

    // Empty lines
    if (!trimmed) {
      flushList();
      continue; 
    }

    // Paragraphs
    flushList();
    elements.push(
      <p key={`p-${i}`} className="mb-3 leading-relaxed text-slate-800 dark:text-slate-300 font-normal">
        {parseInline(trimmed)}
      </p>
    );
  }
  
  flushList();
  flushTable();
  flushCodeBlock();
  
  return <div className="w-full">{elements}</div>;
};

// --- Handoff Widget ---

const HandoffWidget: React.FC<{ data: AgentHandoffData, onHandoff?: (prompt: string) => void }> = ({ data, onHandoff }) => {
  const { handoff } = data;
  
  if (!handoff) return null;

  return (
    <div className="mt-6 mb-2 animate-[fadeIn_0.5s_ease-out]">
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-700/50 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center text-2xl">
          🤖
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
             <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-600 text-blue-800 dark:text-white uppercase tracking-wider">A2A Protocol</span>
             <span className="text-xs text-slate-400">suggests</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Connect to {handoff.targetAgentName}</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300">{handoff.reason}</p>
        </div>
        <button 
          onClick={() => onHandoff && onHandoff(handoff.suggestedPrompt)}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
        >
          <span>⚡ Connect Agent</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onHandoff }) => {
  const isUser = message.role === 'user';
  
  // Clean display text logic
  let displayText = message.text;
  
  if (!isUser) {
     // 1. Remove Markdown Code Blocks explicitly labeled json
     displayText = displayText.replace(/```json[\s\S]*?```/g, '');
     
     // 2. Remove generic code blocks that contain our specific keys (roadmap, courses, handoff)
     displayText = displayText.replace(/```[\s\S]*?```/g, (match) => {
         if (match.includes('"handoff"') || match.includes('"weeks"') || match.includes('"courses"')) {
             return '';
         }
         return match;
     });

     // 3. Remove RAW JSON blocks (Aggressive Cleaning)
     // This catches cases where the AI forgets code blocks: { "handoff": ... }
     // We match patterns starting with braces that contain our keys
     if (message.type === 'handoff' || (message.data && message.data.handoff)) {
         displayText = displayText.replace(/\{\s*"handoff"[\s\S]*\}/g, '');
     }
     if (message.type === 'roadmap') {
         displayText = displayText.replace(/\{\s*"weeks"[\s\S]*\}/g, '');
     }
     if (message.type === 'courses') {
         displayText = displayText.replace(/\{\s*"courses"[\s\S]*\}/g, '');
     }

     displayText = displayText.trim();
  }

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium shadow-sm relative ${
          isUser 
            ? 'bg-white border border-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600' 
            : 'text-white'
        }`}>
          {isUser ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          ) : (
            <>
              {/* Gradient BG for Bot */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full"></div>
              <span className="relative z-10 font-bold text-xs tracking-tight">NS</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Text Bubble */}
          {displayText && (
            <div className={`text-sm leading-relaxed transition-colors ${
              isUser 
                ? 'px-5 py-3.5 bg-gradient-to-br from-white to-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:from-slate-800 dark:to-slate-800 dark:text-white dark:border-slate-700 rounded-2xl rounded-tr-sm shadow-sm whitespace-pre-wrap' 
                : 'bg-white dark:bg-slate-900/30 backdrop-blur-sm border border-slate-100 dark:border-slate-800/50 p-6 rounded-2xl rounded-tl-sm w-full shadow-sm dark:shadow-none' 
            }`}>
               {isUser ? displayText : <MarkdownRenderer text={displayText} />}
               
               {/* ADK FEATURE: Search Grounding Sources */}
               {message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5 mb-2 text-slate-400 dark:text-slate-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.groundingMetadata.groundingChunks.map((chunk, idx) => 
                        chunk.web ? (
                          <a 
                            key={idx} 
                            href={chunk.web.uri} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] px-2 py-1 rounded bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors truncate max-w-[200px]"
                          >
                             {chunk.web.title}
                          </a>
                        ) : null
                      )}
                    </div>
                  </div>
               )}
            </div>
          )}
          
          {/* Interactive Widgets */}
          {message.type === 'roadmap' && message.data && (
             <RoadmapWidget data={message.data} />
          )}

          {message.type === 'courses' && message.data && (
             <CourseWidget data={message.data} />
          )}

          {/* Render Handoff Widget if handoff data exists, regardless of primary message type */}
          {(message.type === 'handoff' || (message.data && message.data.handoff)) && (
            <HandoffWidget data={message.data} onHandoff={onHandoff} />
          )}

        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
