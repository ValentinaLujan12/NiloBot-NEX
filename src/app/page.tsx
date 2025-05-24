"use client";

import { useEffect, useState, useRef } from "react";
import { checkAuth, logout } from "./utils/auth";
import { LoginForm } from "./components/LoginForm";

interface ChatMessage {
  type: "user" | "bot";
  content: string;
}

interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
}

const ChatMessage = ({ type, content }: ChatMessage) => (
  <div className={`flex ${type === "user" ? "justify-end" : "justify-start"} mb-4`}>
    <div
      className={`max-w-md px-4 py-3 rounded-2xl text-base font-sans whitespace-pre-wrap ${
        type === "user"
          ? "bg-blue-500 text-white"
          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      }`}
    >
      {content}
    </div>
  </div>
);

const ChatItem = ({
  chat,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: Chat;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(chat.name);

  const handleRename = () => {
    if (newName.trim()) {
      onRename(chat.id, newName.trim());
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        isActive ? "bg-gray-100 dark:bg-gray-700" : ""
      }`}
      onClick={() => onSelect(chat.id)}
    >
      {isEditing ? (
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          onBlur={handleRename}
          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none text-sm font-sans text-gray-900 dark:text-gray-100"
          autoFocus
        />
      ) : (
        <span className="flex-1 text-sm font-sans truncate">{chat.name}</span>
      )}
      <div className="flex gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-sans"
        >
          Editar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
          className="text-red-500 hover:text-red-600 dark:hover:text-red-400 text-sm font-sans"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState<"SQL" | "CHAT">("SQL");
  const chatRef = useRef<HTMLDivElement>(null);

  // Cargar tema y chats desde localStorage
  useEffect(() => {
    setIsAuthenticated(checkAuth());
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
    const savedChats = localStorage.getItem("chats");
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
      }
    }
  }, []);

  // Guardar chats en localStorage
  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chats, currentChatId, loading]);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: `Conversación ${chats.length + 1}`,
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setSearch("");
    setIsSidebarOpen(false);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setIsSidebarOpen(false);
  };

  const handleRenameChat = (chatId: string, newName: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, name: newName } : chat
      )
    );
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(chats.length > 1 ? chats[0].id : null);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
  };

  const handleQuery = async () => {
    if (!search.trim() || !currentChatId) return;

    const userMessage: ChatMessage = { type: "user", content: search };
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    );
    setLoading(true);
    setSearch("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.content, mode }),
      });

      const data = await res.json();
      const botMessage: ChatMessage = {
        type: "bot",
        content: typeof data.result === "string" ? data.result : "Respuesta inválida.",
      };
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, botMessage] }
            : chat
        )
      );
    } catch {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  { type: "bot", content: "Error al procesar la respuesta." },
                ],
              }
            : chat
        )
      );
    }

    setLoading(false);
  };

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex font-sans">
      {/* Barra lateral */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-30 p-4 flex flex-col gap-4 shadow-lg`}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Historial</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg"
          >
            Cerrar
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
        >
          Nueva Conversación
        </button>
        <div className="flex-1 overflow-y-auto space-y-2">
          {chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === currentChatId}
              onSelect={handleSelectChat}
              onRename={handleRenameChat}
              onDelete={handleDeleteChat}
            />
          ))}
          {chats.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              No hay conversaciones. Crea una nueva.
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition font-medium"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col px-4 py-8 md:px-6 relative">
        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-3 items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg font-medium"
          >
            Menú
          </button>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 flex items-center px-1 rounded-full transition-colors ${
              isDark ? "bg-gray-700" : "bg-gray-200"
            }`}
            aria-label="Cambiar tema"
          >
            <div
              className={`w-5 h-5 bg-white dark:bg-gray-300 rounded-full shadow-md transform transition-transform ${
                isDark ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="max-w-4xl mx-auto w-full flex flex-col justify-center items-center flex-1">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-center">
            NILO Asistente
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 text-center mb-8 md:mb-10">
            Tu asistente para análisis de facturación y nómina electrónica.
          </p>

          <div className="flex justify-center gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded-lg font-medium border ${
                mode === "SQL"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
              }`}
              onClick={() => setMode("SQL")}
            >
              Modo SQL
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium border ${
                mode === "CHAT"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
              }`}
              onClick={() => setMode("CHAT")}
            >
              Modo Natural
            </button>
          </div>

          <div
            ref={chatRef}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-4 shadow-md flex-1 overflow-y-auto"
          >
            {currentChat ? (
              currentChat.messages.map((msg, idx) => (
                <ChatMessage key={idx} type={msg.type} content={msg.content} />
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-lg font-sans">
                Selecciona una conversación o crea una nueva.
              </div>
            )}
            {loading && (
              <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse font-sans">
                NILO está respondiendo...
              </div>
            )}
          </div>

          <div className="w-full mt-6 flex flex-col items-center">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                placeholder="Escribe tu pregunta..."
                className="w-full px-5 py-3 rounded-xl text-base font-sans border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-12"
                disabled={loading || !currentChatId}
              />
              <button
                onClick={handleQuery}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50"
                disabled={loading || !currentChatId}
                aria-label="Enviar mensaje"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}