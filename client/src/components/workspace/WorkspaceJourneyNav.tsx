/**
 * WorkspaceJourneyNav — sticky sub-nav between summary and generators
 */

export default function WorkspaceJourneyNav() {
  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="bg-white border-b-2 border-neutral-950 z-20" aria-label="Workspace sections">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-2xs font-semibold uppercase tracking-widest text-neutral-400 mr-1 hidden sm:inline">
          Jump
        </span>
        <button
          type="button"
          onClick={() => scrollToId('workspace-summary')}
          className="text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 border-2 border-neutral-950 bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors"
          style={{ boxShadow: '1px 1px 0 0 #0f0f0f' }}
        >
          Your summary
        </button>
        <button
          type="button"
          onClick={() => scrollToId('detailed-tools')}
          className="text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 border-2 border-neutral-950 bg-white text-neutral-800 hover:bg-neutral-100 transition-colors"
          style={{ boxShadow: '1px 1px 0 0 #0f0f0f' }}
        >
          AI generators
        </button>
      </div>
    </nav>
  );
}
