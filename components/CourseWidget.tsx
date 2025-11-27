import React from 'react';
import { CourseData } from '../types';

interface CourseWidgetProps {
  data: CourseData;
}

const CourseWidget: React.FC<CourseWidgetProps> = ({ data }) => {
  const getLevelColor = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes('begin')) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
    if (l.includes('inter')) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
    if (l.includes('advan')) return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30';
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';
  };

  return (
    <div className="w-full mt-4 space-y-4">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
         <span className="text-purple-600 dark:text-purple-400">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10v6"/><path d="M20 10a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6Z"/><path d="M12 2v6"/><path d="M12 18v4"/></svg>
         </span>
         <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100 tracking-wider">RECOMMENDED COURSES</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.courses.map((course, idx) => (
          <div 
            key={idx} 
            className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 hover:border-blue-300 dark:hover:bg-slate-800 transition-colors shadow-sm dark:shadow-none"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {course.platform}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getLevelColor(course.level)}`}>
                {course.level}
              </span>
            </div>
            
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-3 leading-snug">
              {course.courseName}
            </h4>
            
            <div className="mt-auto pt-2">
              <a 
                href={course.link.startsWith('http') ? course.link : `https://www.google.com/search?q=${encodeURIComponent(course.courseName + ' ' + course.platform)}`}
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                View Course
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseWidget;