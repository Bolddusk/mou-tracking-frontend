export default function FilePreviewModal({ open, title, fileUrl, onClose }) {
  if (!open || !fileUrl) return null

  const isPdf = fileUrl.toLowerCase().includes('.pdf')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close preview"
      />
      <div className="relative z-10 flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <h3 className="truncate text-lg font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100">
          {isPdf ? (
            <iframe src={fileUrl} title={title} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full flex-col">
              <iframe src={fileUrl} title={title} className="min-h-0 flex-1 border-0" />
              <p className="border-t border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-500">
                Word files may download instead of previewing. PDF previews work best in-browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
