type Draft = Record<string, any>;

/** Only fields accepted by the Cycle Hub request may be restored or submitted. */
export function cycleAdmissionEdits(
    values: Draft,
    editableFields: string[],
): Draft {
    return Object.fromEntries(
        editableFields
            .filter((field) => Object.hasOwn(values, field))
            .map((field) => [field, values[field]]),
    );
}

export function restoreCycleAdmissionDraft(
    initial: Draft,
    cached: unknown,
    editableFields: string[],
    uploadFields: string[],
): Draft {
    if (!cached || typeof cached !== 'object' || Array.isArray(cached))
        return initial;
    const draft = cached as Draft;
    if (draft.revision !== initial.revision || draft.id !== initial.id)
        return initial;
    const edits = cycleAdmissionEdits(draft, editableFields);
    // A browser cache cannot supply a document path or restore a File object.
    // Null is an intentional removal; otherwise keep the server's document.
    for (const field of uploadFields) {
        if (edits[field] !== null) delete edits[field];
    }
    return { ...initial, ...edits };
}
