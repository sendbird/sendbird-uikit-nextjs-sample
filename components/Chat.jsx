import SendbirdApp from '@sendbird/uikit-react/App';
const APP_ID = "2D7B4CDB-932F-4082-9B09-A1153792DC8D";
const USER_ID = "sendbirdian-200720";

const Chat = () => (
    <div style={{ height: "100vh", width: "100vw" }}>
        <SendbirdApp appId={APP_ID} userId={USER_ID} />
    </div>
);

export default Chat;
