import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiBlogs, setLastBlogId } from "../lib/api.js";
import { useSettings } from "./SettingsContext.jsx";

const BlogContext = createContext(null);

const EMPTY = {
  blog: null,
  settings: null,
  storage: null,
  loading: false,
  error: null,
  refresh: async () => null,
};

/**
 * Carrega um blog (pelo slug, no site publico, ou pelo id, no painel),
 * aplica a aparencia dele no tema e disponibiliza os dados para a arvore.
 *
 * `identifier` nulo (ex.: lista de blogs no painel) nao dispara busca.
 */
export function BlogProvider({ mode = "slug", identifier = null, children }) {
  const { setSettings } = useSettings();

  const [blog, setBlog] = useState(null);
  const [settings, setLocalSettings] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (identifier === null || identifier === undefined || identifier === "") {
      setBlog(null);
      setLocalSettings(null);
      setStorage(null);
      setError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const data =
        mode === "slug"
          ? await apiBlogs.getPublic(identifier)
          : await apiBlogs.get(identifier);

      setBlog(data.blog);
      setLocalSettings(data.settings);
      setStorage(data.storage || null);
      setSettings(data.settings); // aplica cores/fontes/template do blog no tema global

      if (mode !== "slug" && data.blog?.id) setLastBlogId(data.blog.id);

      return data;
    } catch (err) {
      setBlog(null);
      setError(err.status === 404 ? "Blog não encontrado." : err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mode, identifier, setSettings]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(
    () => ({ blog, settings, storage, loading, error, refresh: load }),
    [blog, settings, storage, loading, error, load],
  );

  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
}

/**
 * Acesso ao blog atual.
 * Fora de um BlogProvider devolve valores vazios (nunca quebra a tela).
 */
export function useBlog() {
  return useContext(BlogContext) || EMPTY;
}
