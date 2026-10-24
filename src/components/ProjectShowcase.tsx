import React, { useState } from 'react';
import { ProjectCategory, ProjectItem } from '../types/index.ts';
import { filterProjects, getCategoryCounts } from '../utils/communityLogic.ts';
import { Eye, ExternalLink, Code, Layers, Sparkles, Gamepad2, Globe, Wrench, FlaskConical } from 'lucide-react';

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
    <section id="discover" className="py-20 bg-[#0a0a14]/80 backdrop-blur-md border-b border-white/15 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 mb-3 bg-white/10 px-3 py-1 rounded-full border border-white/15">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFF025' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Student Project Showcase
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl lg:text-6xl text-white tracking-normal mb-4">
            Look what we’re building.
          </h2>
          <p className="text-base sm:text-lg text-white/85 font-medium leading-relaxed">
            Every project starts with an idea. Discover what other builders are making, get inspired and share something of your own.
          </p>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-white/15">
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
                      : 'border-white/20 bg-white/5 hover:bg-white/10 text-white'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#FFF025' : undefined,
                  }}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span
                    className={`ml-1 text-[11px] font-black px-1.5 py-0.2 rounded-md ${
                      isActive ? 'bg-black text-white' : 'bg-white/15 text-white'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tool, or tag..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm font-medium border-2 border-white/20 rounded-xl bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#FFF025] text-white placeholder:text-white/50"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-black/30 rounded-2xl p-8">
            <h3 className="font-chewy text-2xl text-black mb-2">No projects found</h3>
            <p className="text-sm text-black/70 mb-4">
              Try adjusting your category filter or search keywords.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl border-2 border-black bg-[#FFF025]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => {
              return (
                <article
                  key={project.id}
                  className="group flex flex-col bg-[#10101c]/95 backdrop-blur-md rounded-2xl border-2 border-white/20 brand-shadow transition-all duration-200 hover:-translate-y-1.5 hover:border-[#FFF025] overflow-hidden text-white"
                >
                  {/* Visual Top Preview Frame */}
                  <div
                    className="relative h-48 border-b-2 border-black/40 p-4 flex flex-col justify-between overflow-hidden bg-black"
                  >
                    {/* Background geometric decorative pattern */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(${project.previewAccent} 1.5px, transparent 1.5px)`,
                        backgroundSize: '16px 16px',
                      }}
                    />

                    {/* Category Label & Demo Type Badge */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span
                        className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-md border border-black"
                        style={{
                          backgroundColor: project.previewAccent,
                          color: project.previewAccent === '#FFF025' ? '#000000' : '#FFFFFF',
                        }}
                      >
                        {project.category}
                      </span>
                      <span className="text-[11px] font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded border border-white/20">
                        {project.demoType.replace('-', ' ')}
                      </span>
                    </div>

                    {/* Centered Graphic Preview Representation */}
                    <div className="relative z-10 my-auto text-center">
                      <div
                        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-white transition-transform group-hover:scale-110"
                        style={{ backgroundColor: project.previewAccent }}
                      >
                        {project.category === 'games' && <Gamepad2 className="w-7 h-7 text-black stroke-[2.5]" />}
                        {project.category === 'websites' && <Globe className="w-7 h-7 text-black stroke-[2.5]" />}
                        {project.category === 'experiments' && <FlaskConical className="w-7 h-7 text-white stroke-[2.5]" />}
                        {project.category === 'tools' && <Wrench className="w-7 h-7 text-white stroke-[2.5]" />}
                      </div>
                      <div className="text-xs font-mono font-bold text-white/90 mt-2 truncate px-4">
                        {project.title}
                      </div>
                    </div>

                    {/* Creator Attribution */}
                    <div className="relative z-10 flex items-center justify-between text-xs text-white/80 pt-2 border-t border-white/10">
                      <span className="font-medium text-white">{project.creator.name}</span>
                      <span className="text-white/60 text-[11px]">{project.creator.school}</span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-chewy text-2xl text-white mb-1 group-hover:text-[#FFF025] transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-xs font-semibold text-white/75 mb-3">
                        {project.tagline}
                      </p>
                      <p className="text-xs text-white/80 leading-relaxed line-clamp-3 mb-4">
                        {project.description}
                      </p>

                      {/* Tool Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {project.tools.slice(0, 3).map((tool, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/15"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Action Button */}
                    <div className="pt-4 border-t border-white/15 flex items-center justify-between">
                      <button
                        onClick={() => onSelectProject(project)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-black rounded-xl border-2 border-black transition-transform active:translate-y-0.5 hover:-translate-y-0.5 cursor-pointer"
                        style={{ backgroundColor: '#FFF025' }}
                        aria-label={`View Project details for ${project.title}`}
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>View Project</span>
                      </button>

                      <span className="text-[11px] font-bold text-white/60">
                        {project.whatLearned.length} learning takeaways
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Section Bottom CTA Banner */}
        <div className="mt-16 p-8 rounded-3xl border-2 border-white/20 brand-shadow bg-[#10101c]/95 backdrop-blur-md text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="font-chewy text-3xl sm:text-4xl text-white mb-2">
              Have a build of your own to showcase?
            </h3>
            <p className="text-sm text-white/80 max-w-xl">
              Whether it’s a 10-line text adventure or a multi-page school website, share your build and help other students learn.
            </p>
          </div>
          <button
            onClick={onSubmitProjectClick}
            className="px-6 py-3.5 text-sm font-black text-black rounded-xl border-2 border-white brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 whitespace-nowrap cursor-pointer shrink-0"
            style={{ backgroundColor: '#FFF025' }}
          >
            Share a Project
          </button>
        </div>

      </div>
    </section>
  );
};
