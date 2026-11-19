import type { ComponentProps } from "react";
import type SendbirdProvider from "@sendbird/uikit-react/SendbirdProvider";

type ProviderProps = ComponentProps<typeof SendbirdProvider>;

export const uikitOptions: ProviderProps["uikitOptions"] = {
  groupChannel: {
    enableReactions: true,
    enableTypingIndicator: true,
    typingIndicatorTypes: new Set(["bubble"]),
    enableVoiceMessage: true,
    enableMarkAsUnread: false,
  },
  groupChannelList: {
    enableTypingIndicator: true,
    enableMessageReceiptStatus: true,
  },
};

export const colorSet: ProviderProps["colorSet"] = {
  "--sendbird-light-primary-500": "#0b5046",
  "--sendbird-light-primary-400": "#0f6558",
  "--sendbird-light-primary-300": "#117062",
  "--sendbird-light-primary-200": "#9ed6ca",
  "--sendbird-light-primary-100": "#d3eee8",
  "--sendbird-light-secondary-300": "#117062",
  "--sendbird-dark-primary-500": "#0b4f45",
  "--sendbird-dark-primary-400": "#127363",
  "--sendbird-dark-primary-300": "#1e9a84",
  "--sendbird-dark-primary-200": "#6fd1bc",
  "--sendbird-dark-primary-100": "#cff2ea",
};

export const stringSet: ProviderProps["stringSet"] = {
  MODAL__CREATE_CHANNEL__TITLE: "New chat",
  PLACE_HOLDER__NO_CHANNEL: "No chats",
  CHANNEL_PREVIEW_MOBILE_LEAVE: "Leave chat",
  CHANNEL_SETTING__HEADER__TITLE: "Chat info",
  CHANNEL_SETTING__LEAVE_CHANNEL__TITLE: "Leave chat",
  CHANNEL_SETTING__FREEZE_CHANNEL: "Freeze chat",
  CHANNEL_FROZEN: "Chat is frozen",
  MODAL__VOICE_MESSAGE_INPUT_DISABLED__TITLE_FROZEN: "Chat is frozen.",
  MESSAGE_INPUT__PLACE_HOLDER__FROZEN: "This chat is frozen",
  MESSAGE_INPUT__PLACE_HOLDER__DISABLED: "You can't send messages in this chat",
  MODAL__LEAVE_CHANNEL__TITLE: "Leave this chat?",
  MODAL__CHANNEL_INFORMATION__TITLE: "Edit chat info",
  MODAL__CHANNEL_INFORMATION__CHANNEL_IMAGE: "Chat image",
  MODAL__CHANNEL_INFORMATION__CHANNEL_NAME: "Chat name",
  MESSAGE_INPUT__PLACE_HOLDER: "Type a message",
};
