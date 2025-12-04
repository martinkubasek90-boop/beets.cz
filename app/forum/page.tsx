'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import { translate } from '../../lib/i18n';
import { useLanguage } from '../../lib/useLanguage';

type Category = {
  id: string;
  name: string;
  description: string | null;
  parent_id?: string | null;
  children?: Category[];
  user_id?: string | null;
};

type Thread = {
  id: string;
  title: string;
  author: string | null;
  body?: string | null;
  reply_count?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
  category_id: string;
  user_id?: string | null;
};

type Post = {
  id: string;
  author: string | null;
  body: string;
  created_at?: string | null;
};

const demoCategories: Category[] = [
  { id: 'workflow', name: 'Workflow', description: 'Tipy na postupy a routování' },
  { id: 'spoluprace', name: 'Spolupráce', description: 'Hledání spoluprací a výměn' },
  { id: 'mix', name: 'Mix / Master', description: 'Mix, master a postprodukce' },
];

const demoThreads: Thread[] = [
  {
    id: 't1',
    title: 'Jak nastavit swing na MPC One + porovnání s 3000?',
    author: 'Northside',
    reply_count: 12,
    updated_at: new Date().toISOString(),
    category_id: 'workflow',
  },
  {
    id: 't2',
    title: 'Hledám beat s kytarou, 92 BPM, melancholie',
    author: 'MC Panel',
    reply_count: 7,
    updated_at: new Date().toISOString(),
    category_id: 'spoluprace',
  },
];

export default function ForumPage() {
  const supabase = createClient();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [threads, setThreads] = useState<Thread[]>(demoThreads);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [savingThread, setSavingThread] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [showThreadForm, setShowThreadForm] = useState(false);

  const isUuid = (val: string) => /^[0-9a-fA-F-]{36}$/.test(val);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      setSessionUser(userId);
    };
    loadSession();
  }, [supabase]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('forum_categories')
          .select('id, name, description, parent_id, user_id')
          .order('name', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          setCategories(data as Category[]);
          setSelectedCategory((data[0] as Category).id);
        } else {
          setCategories(demoCategories);
          setSelectedCategory(demoCategories[0].id);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object'
              ? JSON.stringify(err)
              : String(err);
        console.error('Chyba načítání kategorií:', msg, err);
        setCategoriesError(`Nepodařilo se načíst kategorie. ${msg || ''}`.trim());
        setCategories(demoCategories);
        setSelectedCategory(demoCategories[0].id);
      }
    };
    loadCategories();
  }, [supabase]);

  useEffect(() => {
    const loadThreads = async () => {
      if (!selectedCategory) return;
      // pokud je vybraná demo kategorie (není UUID), použijeme demo vlákna
      if (!isUuid(selectedCategory)) {
        setThreads(demoThreads.filter((t) => t.category_id === selectedCategory));
        setSelectedThread(null);
        setPosts([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('forum_threads')
          .select('id, title, body, author, reply_count, updated_at, created_at, category_id, user_id')
          .eq('category_id', selectedCategory)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          setThreads(data as Thread[]);
          setThreadsError(null);
        } else {
          setThreads([]);
          setThreadsError(null);
        }
        setSelectedThread(null);
        setPosts([]);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object'
              ? JSON.stringify(err)
              : String(err);
        console.error('Chyba načítání vláken:', msg, err);
        setThreadsError('Nepodařilo se načíst vlákna. Zobrazuji demo.');
        setThreads(demoThreads.filter((t) => t.category_id === selectedCategory));
      }
    };
    loadThreads();
  }, [selectedCategory, supabase]);

  const handleCreateCategory = async () => {
    if (!sessionUser) {
      setCategoriesError('Musíš být přihlášen.');
      return;
    }
    if (!newCategoryName.trim()) {
      setCategoriesError('Zadej název kategorie.');
      return;
    }
    setSavingCategory(true);
    setCategoriesError(null);
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .insert({
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim() || null,
          parent_id: newCategoryParent || null,
          user_id: sessionUser,
        })
        .select('id, name, description, parent_id, user_id')
        .single();
      if (error) throw error;
      if (data) {
        setCategories((prev) => [...prev, data as Category]);
        setSelectedCategory(data.id as string);
        setNewCategoryName('');
        setNewCategoryDesc('');
        setNewCategoryParent(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' ? JSON.stringify(err) : String(err);
      console.error('Chyba při založení kategorie:', msg, err);
      setCategoriesError('Nepodařilo se založit kategorii.');
    } finally {
      setSavingCategory(false);
    }
  };

  const loadPosts = async (threadId: string) => {
    if (!isUuid(threadId)) {
      setPosts([]);
      setPostsError(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('id, author, body, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPosts((data as Post[]) ?? []);
      setPostsError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' ? JSON.stringify(err) : String(err);
      console.error('Chyba načítání příspěvků:', msg, err);
      setPostsError('Nepodařilo se načíst příspěvky.');
      setPosts([]);
    }
  };

  async function handleCreateThread() {
    if (!sessionUser) return;
    if (!newThreadTitle.trim() || !newThreadBody.trim()) return;
    if (!isUuid(selectedCategory)) {
      setThreadsError('Zvol platnou kategorii (databázovou) pro založení vlákna.');
      return;
    }
    setSavingThread(true);
    try {
      const payload = {
        title: newThreadTitle.trim(),
        body: newThreadBody.trim(),
        category_id: selectedCategory,
        user_id: sessionUser,
        author: sessionUser,
      };
      let insertedThread: Thread | null = null;

      // Zkus RPC, ale pokud neexistuje, fallback na prostý insert
      const { data, error } = await supabase.rpc('create_thread_with_first_post', payload);
      if (error) {
        console.warn('RPC create_thread_with_first_post selhalo, zkouším fallback insert:', error);
      } else if (data) {
        insertedThread = data as Thread;
      }

      if (!insertedThread) {
        const { data: tData, error: tErr } = await supabase
          .from('forum_threads')
          .insert({
            title: payload.title,
            category_id: payload.category_id,
            author: sessionUser,
            user_id: sessionUser,
            body: payload.body,
          })
          .select('id, title, body, author, reply_count, updated_at, created_at, category_id, user_id')
          .single();
        if (tErr) throw tErr;
        insertedThread = tData as Thread;

        // vlož i první příspěvek
        if (isUuid((insertedThread as any).id)) {
          await supabase.from('forum_posts').insert({
            thread_id: insertedThread.id,
            body: payload.body,
            author: sessionUser,
          });
        }
      }

      if (insertedThread) {
        setThreads((prev) => [insertedThread as Thread, ...prev]);
      }
      setNewThreadTitle('');
      setNewThreadBody('');
      setShowThreadForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' ? JSON.stringify(err) : String(err);
      console.error('Chyba při založení vlákna:', msg, err);
      setThreadsError('Nepodařilo se vytvořit vlákno. Zkus to znovu.');
    } finally {
      setSavingThread(false);
    }
  }

  async function handleCreatePost() {
    if (!sessionUser || !selectedThread) return;
    if (!newPostBody.trim()) return;
    setSavingPost(true);
    try {
      const payload = {
        thread_id: selectedThread.id,
        body: newPostBody.trim(),
        author: sessionUser,
      };
      const { data, error } = await supabase
        .from('forum_posts')
        .insert(payload)
        .select('id, author, body, created_at')
        .single();
      if (error) throw error;
      if (data) {
        setPosts((prev) => [...prev, data as Post]);
      }
      setNewPostBody('');
    } catch (err) {
      console.error('Chyba při odeslání příspěvku:', err);
      setPostsError('Nepodařilo se uložit příspěvek.');
    } finally {
      setSavingPost(false);
    }
  }

  async function handleUpdateThread(id: string, title: string, body: string) {
    if (!sessionUser || !isUuid(id)) return;
    try {
      const { data, error } = await supabase
        .from('forum_threads')
        .update({ title, body })
        .eq('id', id)
        .eq('user_id', sessionUser)
        .select('id, title, body, author, reply_count, updated_at, category_id, user_id')
        .single();
      if (error) throw error;
      if (data) {
        setThreads((prev) => prev.map((t) => (t.id === id ? (data as Thread) : t)));
        if (selectedThread?.id === id) {
          setSelectedThread(data as Thread);
        }
      }
    } catch (err) {
      console.error('Chyba při úpravě vlákna:', err);
      setThreadsError('Nepodařilo se upravit vlákno.');
    }
  }

  async function handleDeleteThread(id: string) {
    if (!sessionUser || !isUuid(id)) return;
    try {
      const { error } = await supabase.from('forum_threads').delete().eq('id', id).eq('user_id', sessionUser);
      if (error) throw error;
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (selectedThread?.id === id) {
        setSelectedThread(null);
        setPosts([]);
      }
    } catch (err) {
      console.error('Chyba při mazání vlákna:', err);
      setThreadsError('Nepodařilo se smazat vlákno.');
    }
  }

  async function handleUpdateCategory(id: string, name: string, description: string | null, parentId: string | null) {
    if (!sessionUser || !isUuid(id)) return;
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .update({ name, description, parent_id: parentId })
        .eq('id', id)
        .eq('user_id', sessionUser)
        .select('id, name, description, parent_id, user_id')
        .single();
      if (error) throw error;
      if (data) {
        setCategories((prev) => prev.map((c) => (c.id === id ? (data as Category) : c)));
      }
    } catch (err) {
      console.error('Chyba při úpravě kategorie:', err);
      setCategoriesError('Nepodařilo se upravit kategorii.');
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!sessionUser || !isUuid(id)) return;
    try {
      const { error } = await supabase.from('forum_categories').delete().eq('id', id).eq('user_id', sessionUser);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategory === id) {
        setSelectedCategory('');
        setThreads([]);
        setSelectedThread(null);
      }
    } catch (err) {
      console.error('Chyba při mazání kategorie:', err);
      setCategoriesError('Nepodařilo se smazat kategorii.');
    }
  }

  return (
    <main className="min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em] text-white">{t('forum.title', 'Komunita · Fórum')}</h1>
            <p className="text-sm text-[var(--mpc-muted)]">{t('forum.subtitle', 'Diskuze, feedback, rychlé domluvy')}</p>
          </div>
          <Link href="/" className="text-[12px] text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
            {t('forum.back', '← Zpět na homepage')}
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
          <aside className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">{t('forum.categories', 'Kategorie')}</h2>
            {categoriesError && (
              <div className="rounded-md border border-yellow-700/50 bg-yellow-900/30 px-3 py-2 text-xs text-yellow-100">
                {categoriesError}
              </div>
            )}
            <div className="space-y-2">
              {categories
                .filter((c) => !c.parent_id)
                .map((cat) => {
                  const children = categories.filter((c) => c.parent_id === cat.id);
                  return (
                    <div key={cat.id}>
                      <button
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                          selectedCategory === cat.id
                            ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/15 text-white'
                            : 'border-white/10 bg-white/5 text-[var(--mpc-light)] hover:border-[var(--mpc-accent)]'
                        }`}
                      >
                        <div className="font-semibold">{cat.name}</div>
                        <div className="text-[12px] text-[var(--mpc-muted)]">{cat.description}</div>
                      </button>
                      {sessionUser && sessionUser === cat.user_id && isUuid(cat.id) && (
                        <div className="mt-1 flex flex-wrap gap-2 pl-1 text-[11px] text-[var(--mpc-muted)]">
                          <button
                            onClick={() => {
                              const name = prompt('Upravit název kategorie', cat.name) ?? cat.name;
                              const desc = prompt('Upravit popis', cat.description || '') ?? cat.description;
                              const parent = cat.parent_id || '';
                              handleUpdateCategory(cat.id, name, desc || null, parent || null);
                            }}
                            className="rounded-full border border-white/10 px-2 py-1 hover:border-[var(--mpc-accent)] hover:text-white"
                          >
                            Upravit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="rounded-full border border-white/10 px-2 py-1 text-red-300 hover:border-red-400 hover:text-white"
                          >
                            Smazat
                          </button>
                        </div>
                      )}
                      {children.length > 0 && (
                        <div className="mt-1 space-y-1 pl-3 border-l border-white/10">
                          {children.map((child) => (
                            <div key={child.id}>
                              <button
                                onClick={() => setSelectedCategory(child.id)}
                                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                                  selectedCategory === child.id
                                    ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/15 text-white'
                                    : 'border-white/10 bg-white/5 text-[var(--mpc-light)] hover:border-[var(--mpc-accent)]'
                                }`}
                              >
                                <div className="font-semibold">↳ {child.name}</div>
                                <div className="text-[12px] text-[var(--mpc-muted)]">{child.description}</div>
                              </button>
                              {sessionUser && sessionUser === child.user_id && isUuid(child.id) && (
                                <div className="mt-1 flex flex-wrap gap-2 pl-2 text-[11px] text-[var(--mpc-muted)]">
                                  <button
                                    onClick={() => {
                                      const name = prompt('Upravit název subkategorie', child.name) ?? child.name;
                                      const desc = prompt('Upravit popis', child.description || '') ?? child.description;
                                      handleUpdateCategory(child.id, name, desc || null, cat.id);
                                    }}
                                    className="rounded-full border border-white/10 px-2 py-1 hover:border-[var(--mpc-accent)] hover:text-white"
                                  >
                                    Upravit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(child.id)}
                                    className="rounded-full border border-white/10 px-2 py-1 text-red-300 hover:border-red-400 hover:text-white"
                                  >
                                    Smazat
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            {sessionUser ? (
                <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-[var(--mpc-light)]">
                  <div className="font-semibold text-white">{t('forum.category.new', 'Nová kategorie')}</div>
                  <input
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    placeholder={t('forum.category.namePlaceholder', 'Název kategorie')}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <input
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    placeholder={t('forum.category.descPlaceholder', 'Popis (volitelně)')}
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                  />
                <select
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                  value={newCategoryParent || ''}
                  onChange={(e) => setNewCategoryParent(e.target.value || null)}
                >
                  <option value="">{t('forum.category.parent.none', 'Bez rodiče')}</option>
                  {categories.filter((c) => !c.parent_id).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {newCategoryParent && (
                  <button
                    type="button"
                    onClick={() => setNewCategoryParent(null)}
                    className="text-[11px] text-[var(--mpc-muted)] hover:text-white"
                  >
                    {t('forum.category.parent.remove', 'Odebrat rodiče')}
                  </button>
                )}
                  <button
                    onClick={handleCreateCategory}
                    disabled={savingCategory}
                    className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                  >
                  {savingCategory ? t('forum.category.creating', 'Zakládám…') : t('forum.category.create', 'Přidat kategorii')}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--mpc-muted)]">{t('forum.category.loginNote', 'Přihlášením můžeš přidávat kategorie.')}</p>
            )}
          </aside>

          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.35)]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{t('forum.threads', 'Vlákna')}</h2>
                  <p className="text-[12px] text-[var(--mpc-muted)]">
                    {categories.find((c) => c.id === selectedCategory)?.name || 'Kategorie'}
                  </p>
                </div>
                {sessionUser ? (
                  <button
                    onClick={() => setShowThreadForm((v) => !v)}
                    className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                  >
                    {showThreadForm ? t('forum.thread.hide', 'Skrýt formulář') : t('forum.thread.show', 'Založit vlákno')}
                  </button>
                ) : (
                  <p className="text-[11px] text-[var(--mpc-muted)]">Přihlášení mohou zakládat vlákna a psát příspěvky.</p>
                )}
              </div>
              {sessionUser && showThreadForm && (
                <div className="mb-4 rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-white">{t('forum.thread.new', 'Nové vlákno')}</h3>
                  <input
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    placeholder={t('forum.thread.titlePlaceholder', 'Název vlákna')}
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    placeholder={t('forum.thread.bodyPlaceholder', 'Popiš téma, otázku nebo zadání…')}
                    rows={3}
                    value={newThreadBody}
                    onChange={(e) => setNewThreadBody(e.target.value)}
                  />
                  <button
                    onClick={handleCreateThread}
                    disabled={savingThread || !isUuid(selectedCategory)}
                    className="inline-flex rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.15em] text-white shadow-[0_8px_20px_rgba(255,75,129,0.35)] disabled:opacity-60"
                  >
                    {savingThread ? t('forum.thread.creating', 'Zakládám…') : t('forum.thread.create', 'Založit vlákno')}
                  </button>
                </div>
              )}
              {threadsError && (
                <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                  {threadsError}
                </div>
              )}
              <div className="space-y-3">
                {threads.length === 0 ? (
                  <p className="text-sm text-[var(--mpc-muted)]">{t('forum.threads.empty', 'Zatím žádná vlákna.')}</p>
                ) : (
                  threads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        selectedThread?.id === thread.id
                          ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/10'
                          : 'border-white/10 bg-white/5 hover:border-[var(--mpc-accent)]'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedThread(thread);
                          loadPosts(thread.id);
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between text-[12px] text-[var(--mpc-muted)]">
                          <span>
                            {thread.author && isUuid(thread.author) ? t('forum.user', 'Uživatel') : (thread.author || t('forum.user', 'Uživatel'))}
                            {thread.created_at && (
                              <span className="ml-2 text-[11px] text-[var(--mpc-muted)]">
                                • {new Date(thread.created_at).toLocaleDateString('cs-CZ')}
                              </span>
                            )}
                          </span>
                          <span>
                            {thread.reply_count ? `${thread.reply_count} ${t('forum.replies', 'odpovědí')}` : t('forum.new', 'Nové')}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white">{thread.title}</div>
                      </button>
                      {sessionUser === thread.user_id && (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--mpc-muted)]">
                          <button
                            onClick={() => {
                              const title = prompt('Upravit název vlákna', thread.title);
                              const body = prompt('Upravit popis / úvodní text', thread.body || '');
                              if (title !== null) {
                                handleUpdateThread(thread.id, title, body ?? thread.body ?? '');
                              }
                            }}
                            className="rounded-full border border-white/10 px-3 py-1 hover:border-[var(--mpc-accent)] hover:text-white"
                          >
                            Upravit
                          </button>
                          <button
                            onClick={() => handleDeleteThread(thread.id)}
                            className="rounded-full border border-white/10 px-3 py-1 text-red-300 hover:border-red-400 hover:text-white"
                          >
                            Smazat
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.35)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{t('forum.posts.title', 'Příspěvky ve vlákně')}</h3>
                {selectedThread && (
                  <span className="text-[12px] text-[var(--mpc-muted)]">{selectedThread.title}</span>
                )}
              </div>
              {postsError && (
                <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                  {postsError}
                </div>
              )}
              {selectedThread ? (
                <div className="space-y-3">
                  {posts.length === 0 ? (
                    <p className="text-sm text-[var(--mpc-muted)]">{t('forum.posts.empty', 'Zatím žádné odpovědi.')}</p>
                  ) : (
                    posts.map((p) => (
                      <div key={p.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                        <div className="flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                          <span>{p.author || t('forum.user', 'Uživatel')}</span>
                          <span>{p.created_at ? new Date(p.created_at).toLocaleString('cs-CZ') : ''}</span>
                        </div>
                        <p className="mt-1 text-[var(--mpc-light)] whitespace-pre-line">{p.body}</p>
                      </div>
                    ))
                  )}
                  {sessionUser ? (
                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
                      <textarea
                        className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                        placeholder={t('forum.posts.placeholder', 'Napiš odpověď…')}
                        rows={3}
                        value={newPostBody}
                        onChange={(e) => setNewPostBody(e.target.value)}
                      />
                      <button
                        onClick={handleCreatePost}
                        disabled={savingPost}
                        className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                      >
                        {savingPost ? t('forum.posts.sending', 'Odesílám…') : t('forum.posts.reply', 'Odpovědět')}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--mpc-muted)]">{t('forum.posts.loginNote', 'Přihlášení mohou odpovídat.')}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--mpc-muted)]">{t('forum.posts.select', 'Vyber vlákno vlevo a zobrazí se příspěvky.')}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
