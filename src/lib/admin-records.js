function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function beginRecordEdit(record, key, index) {
  return {
    key,
    index,
    original: record ? clone(record) : null,
    value: record ? clone(record) : null,
  };
}

export function updateRecordEdit(edit, field, value) {
  if (!edit) return edit;
  return {
    ...edit,
    value: { ...edit.value, [field]: value },
  };
}

export function cancelRecordEdit() {
  return null;
}

export function applyRecordEdit(records, edit) {
  if (!edit?.value) return records;
  const index = edit.original
    ? records.findIndex((record, position) =>
        edit.value.id ? record.id === edit.value.id : position === edit.index,
      )
    : -1;

  if (edit.original && index < 0) {
    throw new Error('This record no longer exists. Reload the editor before updating it.');
  }
  if (!edit.original && records.some((record) => record.id === edit.value.id)) {
    throw new Error('This record has already been added.');
  }

  const next = [...records];
  if (edit.original) next[index] = clone(edit.value);
  else next.push(clone(edit.value));
  return next;
}
