import React, { useState } from 'react';
import { ProjectCategory, ProjectItem } from '../types/index.ts';
import { filterProjects, getCategoryCounts } from '../utils/communityLogic.ts';
import { Layers, Gamepad2, Globe, Wrench, FlaskConical, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface ProjectShowcaseProps {
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
  onSubmitProjectClick: () => void;
}

export const ProjectShowcase: React.FC<ProjectShowcaseProps> = ({
  projects,
  onSelectProject,
  onSubmitProjectClick,
}) => {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = filterProjects(projects, selectedCategory, searchQuery);
  const counts = getCategoryCounts(projects);

  const categories: Array<{ id: ProjectCategory; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Creations', icon: <Layers className="w-4 h-4" /> },
    { id: 'games', label: 'Games', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'websites', label: 'Websites', icon: <Globe className="w-4 h-4" /> },
    { id: 'experiments', label: 'Experiments', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'tools', label: 'Creative Tools', icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <section
      id="discover"
      className={`py-20 border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a14]/80 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/90 backdrop-blur-md border-black/10 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div
            className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border ${
              isDark ? 'bg-white/10 border-white/15' : 'bg-amber-100/70 border-black/15'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFF025' }} />
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Student Project Showcase
            </span>
          </div>

          <h2
            className={`font-chewy text-4xl sm:text-5xl lg:text-6xl tracking-normal mb-4 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Look what we’re building.
          </h2>

          <p
            className={`text-base sm:text-lg font-medium leading-relaxed ${
              isDark ? 'text-white/85' : 'text-slate-600'
            }`}
          >
            Every project starts with an idea. Discover what other builders are making, get inspired and share something of your own.
          </p>
        </div>

        {/* Filter Bar & Search */}
        <div
          className={`flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b ${
            isDark ? 'border-white/15' : 'border-black/10'
          }`}
        >
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto" role="tablist">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = counts[cat.id];
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border-2 transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'border-black brand-shadow -translate-y-0.5 text-black'
                      : isDark
                        ? 'border-white/20 bg-white/5 hover:bg-white/10 text-white'
                        : 'border-black/20 bg-black/5 hover:bg-black/10 text-slate-800'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#FFF025' : undefined,
                  }}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span
                    className={`ml-1 text-[11px] font-black px-1.5 py-0.2 rounded-md ${
                      isActive
                        ? 'bg-black text-white'
                        : isDark
                          ? 'bg-white/15 text-white'
                          : 'bg-black/15 text-slate-900'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search & Submit Button */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creations..."
              className={`w-full md:w-64 px-4 py-2.5 text-xs sm:text-sm font-medium border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                isDark
                  ? 'border-white/20 bg-white/10 text-white placeholder:text-white/50'
                  : 'border-black/20 bg-white text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Projects Grid matching Mockup */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-400 rounded-2xl p-8">
            <h3 className="font-chewy text-2xl mb-2">No projects found</h3>
            <p className="text-sm opacity-70 mb-4">
              Try adjusting your category filter or search keywords.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl border-2 border-black bg-[#FFF025] text-black"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProjects.map((project) => {
              return (
                <article
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`group flex flex-col rounded-2xl border-2 transition-all duration-200 hover:-translate-y-1.5 cursor-pointer overflow-hidden brand-shadow ${
                    isDark
                      ? 'bg-[#10101c]/95 border-white/20 hover:border-[#FFF025] text-white'
                      : 'bg-white border-black/15 hover:border-black text-slate-900'
                  }`}
                >
                  {/* Visual Top Preview: Screenshot if available or styled pattern */}
                  <div className="relative h-44 overflow-hidden bg-black/90 flex items-center justify-center">
                    {project.imageUrl ? (
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: project.previewAccent }}
                      >
                        <span className="font-chewy text-2xl text-black">{project.title}</span>
                      </div>
                    )}

                    {/* Category pill on bottom-left of preview */}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span
                        className="px-2.5 py-0.5 text-[11px] font-black capitalize rounded-lg border border-black shadow-sm"
                        style={{
                          backgroundColor:
                            project.category === 'games'
                              ? '#FFF025'
                              : project.category === 'websites'
                              ? '#B11469'
                              : project.category === 'experiments'
                              ? '#C15D00'
                              : '#FFF025',
                          color:
                            project.category === 'websites' || project.category === 'experiments'
                              ? '#FFFFFF'
                              : '#000000',
                        }}
                      >
                        {project.category === 'experiments'
                          ? 'Digital Experiments'
                          : project.category === 'tools'
                          ? 'Creative Tools'
                          : project.category}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-chewy text-xl mb-1 group-hover:text-[#B11469] transition-colors">
                        {project.title}
                      </h3>
                      <p
                        className={`text-xs font-normal leading-relaxed line-clamp-2 mb-4 ${
                          isDark ? 'text-white/75' : 'text-slate-600'
                        }`}
                      >
                        {project.tagline || project.description}
                      </p>
                    </div>

                    {/* Creator Row + Action */}
                    <div
                      className={`pt-3 border-t flex items-center justify-between text-xs ${
                        isDark ? 'border-white/10' : 'border-black/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-black border border-black"
                          style={{ backgroundColor: project.creator.avatarBg || '#FFF025' }}
                        >
                          {project.creator.name.charAt(0)}
                        </span>
                        <span className="font-semibold text-xs truncate max-w-[120px]">
                          {project.creator.name}
                        </span>
                      </div>

                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center border transition-transform group-hover:translate-x-0.5"
                        style={{
                          backgroundColor: '#C15D00',
                          borderColor: '#C15D00',
                          color: '#FFFFFF',
                        }}
                      >
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Explore All Creations Centered Button */}
        <div className="mt-12 text-center">
          <button
            onClick={onSubmitProjectClick}
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm sm:text-base font-black text-white rounded-2xl border-2 border-black brand-shadow transition-transform hover:-translate-y-1 active:translate-y-0.5 cursor-pointer"
            style={{ backgroundColor: '#B11469' }}
          >
            <span>Explore All Creations</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </div>
    </section>
  );
};
