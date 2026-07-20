/** Normalize a profile document so Companies / profile pages can open the file. */
export function documentFileUrl(doc) {
  if (!doc || typeof doc !== 'object') return null
  const raw = doc.file_url || doc.url || doc.path || doc.fileUrl
  if (raw == null) return null
  const text = String(raw).trim()
  return text || null
}

/**
 * Merge completion.mandatory_documents[docType] with documents[] (and optional upload echo).
 * Upload responses often put file_url only on documents[] / document, not on completion.
 */
export function getProfileDocument(
  docType,
  { completion = null, documents = [], uploadedDocument = null } = {},
) {
  const fromCompletionRaw = completion?.mandatory_documents?.[docType]
  const fromCompletion =
    fromCompletionRaw && typeof fromCompletionRaw === 'object' ? fromCompletionRaw : null
  const fromList = Array.isArray(documents)
    ? documents.find((d) => d?.doc_type === docType)
    : null
  const fromUpload =
    uploadedDocument?.doc_type === docType && typeof uploadedDocument === 'object'
      ? uploadedDocument
      : null

  if (!fromCompletion && !fromList && !fromUpload) {
    // Boolean / truthy flag without file metadata — still mark as present for badge
    if (fromCompletionRaw) {
      return { doc_type: docType, file_url: null, original_filename: null }
    }
    return null
  }

  const merged = {
    ...(fromList || {}),
    ...(fromCompletion || {}),
    ...(fromUpload || {}),
    doc_type: docType,
  }

  const file_url =
    documentFileUrl(fromUpload) ||
    documentFileUrl(fromCompletion) ||
    documentFileUrl(fromList) ||
    null

  return {
    ...merged,
    file_url,
    original_filename:
      fromUpload?.original_filename ||
      fromCompletion?.original_filename ||
      fromList?.original_filename ||
      merged.original_filename ||
      null,
  }
}

/** Keep documents[] in sync after GET/PATCH/upload responses. */
export function mergeDocumentsList(previous = [], data = {}) {
  let list = Array.isArray(data.documents) ? [...data.documents] : [...(previous || [])]
  const uploaded = data.document
  if (uploaded?.doc_type) {
    list = list.filter((d) => d?.doc_type !== uploaded.doc_type)
    list.push(uploaded)
  }
  return list
}
