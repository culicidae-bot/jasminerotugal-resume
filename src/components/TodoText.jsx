import { isTodo } from '../lib/format.js';
import { useSite } from '../lib/site-context.js';

export default function TodoText({ value }) {
  const { content } = useSite();
  if (value === null || value === undefined || value === '') {
    return <span className="todo-text">{content.ui.notSet}</span>;
  }
  if (isTodo(value)) return <span className="todo-text">{value}</span>;
  return <>{value}</>;
}
