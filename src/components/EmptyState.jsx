import TodoText from './TodoText.jsx';
import { useSite } from '../lib/site-context.js';

export default function EmptyState({ title, detail, level = 3 }) {
  const { content } = useSite();
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div className="empty-state">
      <p className="empty-label">{content.ui.emptyLabel}</p>
      <Heading>{title}</Heading>
      <p>
        <TodoText value={detail} />
      </p>
    </div>
  );
}
