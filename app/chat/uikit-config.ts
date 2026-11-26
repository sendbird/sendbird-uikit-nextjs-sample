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
