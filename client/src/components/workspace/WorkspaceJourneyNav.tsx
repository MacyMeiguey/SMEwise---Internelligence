/**
 * WorkspaceJourneyNav — quiet in-page jump links under the header.
 */

export default function WorkspaceJourneyNav() {
  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav
      className="bg-white border-b border-neutral-200/90 z-20 dark:bg-[#0c0c10] dark:border-white/[0.07]"
      aria-label="Workspace sections"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-neutral-400 mr-1 hidden sm:inline">
          On this page
        </span>
        <button
          type="button"
          onClick={() => scrollToId('workspace-summary')}
          className="text-xs sm:text-[13px] font-medium rounded-lg px-3 py-1.5 bg-primary-50 text-primary-800 hover:bg-primary-100 transition-colors dark:bg-primary-500/15 dark:text-primary-200 dark:hover:bg-primary-500/25"
        >
          Your summary
        </button>
        <button
          type="button"
          onClick={() => scrollToId('detailed-tools')}
          className="text-xs sm:text-[13px] font-medium rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100"
        >
          Generators
        </button>
      </div>
    </nav>
  );
}
