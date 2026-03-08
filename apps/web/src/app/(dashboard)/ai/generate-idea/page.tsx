import { redirect } from 'next/navigation';

export default function AIGenerateIdeaRedirectPage() {
  redirect('/ideas/create');
}
