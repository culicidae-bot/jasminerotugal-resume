import { isTodo } from '../lib/format.js';

export default function TodoText({ value }) {
  if (value === null || value === undefined || value === '' || isTodo(value)) return null;
  return <>{value}</>;
}
