"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import { SessionHandler, type User } from "@sendbird/chat";
import type { GroupChannelCreateParams, SendbirdGroupChat } from "@sendbird/chat/groupChannel";
import SendbirdProvider from "@sendbird/uikit-react/SendbirdProvider";
import GroupChannelList from "@sendbird/uikit-react/GroupChannelList";
import GroupChannel from "@sendbird/uikit-react/GroupChannel";
import ChannelSettings from "@sendbird/uikit-react/ChannelSettings";
import useSendbirdStateContext from "@sendbird/uikit-react/useSendbirdStateContext";
import "@sendbird/uikit-react/dist/index.css";
import { signOut } from "../login/actions";

const APP_ID = process.env.NEXT_PUBLIC_SENDBIRD_APP_ID ?? "";
const MOBILE_BREAKPOINT = "768px";
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT})`;
const DARK_QUERY = "(prefers-color-scheme: dark)";

type ChatSession = { userId: string; token: string };

class SignedOutError extends Error {}

async function fetchChatSession(): Promise<ChatSession> {
  const res = await fetch("/api/sendbird/token", { method: "POST" });
  if (res.status === 401) throw new SignedOutError("Signed out.");
  if (!res.ok) throw new Error("Chat session unavailable.");
  return res.json();
}

function reuseExistingChannel(params: GroupChannelCreateParams, users: User[]): GroupChannelCreateParams {
  if (!params.invitedUserIds?.length || users.some((user) => !user.isActive)) {
    throw new Error("This user can't receive messages.");
  }
  return { ...params, isDistinct: true };
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export default function Chat() {
  const prefersDark = useMediaQuery(DARK_QUERY);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelUrl, setChannelUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [autoSelectedUrl, setAutoSelectedUrl] = useState("");

  const openChannel = useCallback((url: string, autoSelected = false) => {
    setChannelUrl(url);
    setShowSettings(false);
    setAutoSelectedUrl(autoSelected ? url : "");
  }, []);
  const openDirectMessage = useCallback((channel: { url: string }) => openChannel(channel.url), [openChannel]);

  const handleSessionFailure = useCallback((reason: Error) => {
    if (reason instanceof SignedOutError) window.location.replace("/login");
    else setError(reason.message);
  }, []);

  useEffect(() => {
    let active = true;
    fetchChatSession().then(
      (next) => {
        if (active) setSession(next);
      },
      (reason: Error) => {
        if (active) handleSessionFailure(reason);
      },
    );
    return () => {
      active = false;
    };
  }, [handleSessionFailure]);

  const connected = useRef(false);
  const eventHandlers = useMemo(
    () => ({
      connection: {
        onConnected: () => {
          connected.current = true;
        },
      },
    }),
    [],
  );

  const userId = session?.userId;
  const configureSession = useCallback(
    () =>
      new SessionHandler({
        onSessionTokenRequired: (resolve, reject) => {
          fetchChatSession()
            .then((next) => {
              if (next.userId !== userId) throw new SignedOutError("Signed in as another user.");
              resolve(next.token);
            })
            .catch((reason: Error) => {
              reject(reason);
              handleSessionFailure(reason);
            });
        },
        onSessionClosed: () => {
          if (connected.current) handleSessionFailure(new Error("Chat session ended."));
        },
      }),
    [userId, handleSessionFailure],
  );

  if (error) {
    return (
      <p role="alert" className="p-6">
        Chat couldn&apos;t connect: {error}
      </p>
    );
  }
  if (!session) {
    return <p className="p-6">Connecting…</p>;
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
        <span>
          Signed in as <strong>{session.userId}</strong>
        </span>
        <form action={signOut}>
          <button type="submit" className="font-medium underline">
            Sign out
          </button>
        </form>
      </header>
      <div className="min-h-0 flex-1">
        <SendbirdProvider
          appId={APP_ID}
          userId={session.userId}
          accessToken={session.token}
          configureSession={configureSession}
          eventHandlers={eventHandlers}
          breakpoint={MOBILE_BREAKPOINT}
          theme={prefersDark ? "dark" : "light"}
          onBeforeStartDirectMessage={reuseExistingChannel}
          onStartDirectMessage={openDirectMessage}
        >
          <ChatLayout
            channelUrl={channelUrl}
            showSettings={showSettings}
            autoSelectedUrl={autoSelectedUrl}
            openChannel={openChannel}
            setShowSettings={setShowSettings}
          />
        </SendbirdProvider>
      </div>
    </div>
  );
}

type ChatLayoutProps = {
  channelUrl: string;
  showSettings: boolean;
  autoSelectedUrl: string;
  openChannel: (url: string, autoSelected?: boolean) => void;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
};

function ChatLayout({ channelUrl, showSettings, autoSelectedUrl, openChannel, setShowSettings }: ChatLayoutProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { stores, config } = useSendbirdStateContext();
  const sdk: SendbirdGroupChat = stores.sdkStore.sdk;

  const channelList = (
    <GroupChannelList
      selectedChannelUrl={channelUrl}
      disableAutoSelect={isMobile}
      disableUserProfile
      onChannelSelect={(channel) => openChannel(channel?.url ?? "", !isMobile && !channelUrl)}
      onChannelCreated={(channel) => openChannel(channel.url)}
      onCreateChannelClick={({ users, onClose, channelType }) => {
        const type: string = channelType;
        onClose();
        sdk.groupChannel
          .createChannel({
            invitedUserIds: users,
            operatorUserIds: [config.userId],
            isDistinct: type === "group" && users.length === 1,
            isSuper: type === "supergroup",
            isBroadcast: type === "broadcast",
          })
          .then((created) => openChannel(created.url), console.error);
      }}
    />
  );
  const channel = (
    <GroupChannel
      channelUrl={channelUrl}
      replyType="QUOTE_REPLY"
      showSearchIcon={false}
      onBackClick={() => openChannel("")}
      onChatHeaderActionClick={() => setShowSettings((open) => !open)}
    />
  );
  const settings = (
    <ChannelSettings
      channelUrl={channelUrl}
      onCloseClick={() => setShowSettings(false)}
      onLeaveChannel={() => openChannel("")}
    />
  );

  if (isMobile) {
    if (!channelUrl || channelUrl === autoSelectedUrl) return channelList;
    return showSettings ? settings : channel;
  }

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0">{channelList}</div>
      <div className="min-w-0 flex-1">{channel}</div>
      {showSettings && channelUrl ? <div className="w-80 shrink-0">{settings}</div> : null}
    </div>
  );
}
