export default function ChatbotBanner() {
  return (
    <div className="chat-banner">
      <div className="chat-title">GONGSIL NET</div>
      <div className="chat-sub">궁금한 내용은 뭐든지 챗봇서비스에게!</div>
      <div className="chat-mockup">
        <img 
          src="https://via.placeholder.com/300x450/ccc/999?text=Phone+Mockup" 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          alt="챗봇 목업" 
        />
      </div>
    </div>
  );
}
