import { useSite } from '../lib/site-context.js';

export default function SampleTag() {
  const { content } = useSite();
  return <span className="sample-tag">{content.ui.sampleTag}</span>;
}
