import React from 'react';
import { RoadmapData } from '../types';

interface RoadmapWidgetProps {
  data: RoadmapData;
}

const RoadmapWidget: React.FC<RoadmapWidgetProps> = ({ data }) => {
  // Define colors for each week card
  const colors = [
    'border-t-blue-500',
    'border-t-indigo-500',
    'border-t-violet-500',
    'border-t-purple-500'
  ];

  return (
    <div className="w-full mt-6 space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
         <span className="text-primary bg-primary/10 p-1.5 rounded-lg">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
         </span>
         <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Personalized Learning Path</h3>
      </div>

      {/* Grid for Weeks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.weeks.slice(0, 4).map((week, idx) => (
          <div 
            key={idx}
            className={`group relative p-5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 border-t-4 ${colors[idx % 4]}`}
          >
            <div className="flex flex-col h-full">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">{week.week}</span>
              <h4 className="text-sm font-bold mb-2 text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{week.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{week.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mini Projects Section */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
           <div className="p-1.5 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
           </div>
           <h4 className="font-bold text-slate-900 dark:text-white">Recommended Mini Projects</h4>
        </div>
        <ul className="space-y-3">
          {data.projects.map((proj, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 group">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-primary transition-colors shrink-0"></span>
              <span className="group-hover:text-primary transition-colors duration-200">{proj}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};

export default RoadmapWidget;