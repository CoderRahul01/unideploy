"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Image, Mic, FileText, X, Paperclip, Loader2 } from "lucide-react";
import { projectsApi } from "@/lib/api";

interface MultimodalInputBarProps {
  projectId: string;
  onAssistantReply: (reply: string) => void;
  onUserMessage: (message: string) => void;
  isTyping: boolean;
  setIsTyping: (isTyping: boolean) => void;
}

export default function MultimodalInputBar({
  projectId,
  onAssistantReply,
  onUserMessage,
  isTyping,
  setIsTyping,
}: MultimodalInputBarProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"text" | "image" | "voice" | "doc">("text");
  const [isRecording, setIsVoiceRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSendText = async () => {
    if (!input.trim() && !attachedFile) return;

    onUserMessage(input || (attachedFile ? `Uploaded ${attachedFile.name}` : ""));
    const currentInput = input;
    const currentFile = attachedFile;
    
    setInput("");
    setAttachedFile(null);
    setPreviewUrl(null);
    setIsTyping(true);

    try {
      let reply = "";
      if (mode === "image" && currentFile) {
        const res = await projectsApi.sendVision(projectId, currentFile);
        reply = res.spec;
      } else if (mode === "doc" && currentFile) {
        const res = await projectsApi.sendDocument(projectId, currentFile);
        reply = res.requirements;
      } else {
        const res = await projectsApi.sendChatMessage(projectId, currentInput, []);
        reply = res.reply;
      }
      onAssistantReply(reply);
    } catch (err: any) {
      onAssistantReply("Error: " + (err.message || "Failed to process request"));
    } finally {
      setIsTyping(false);
      setMode("text");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      if (file.type.startsWith("image/")) {
        setMode("image");
        setPreviewUrl(URL.createObjectURL(file));
      } else if (file.type === "application/pdf") {
        setMode("doc");
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsTyping(true);
        onUserMessage("🎤 [Voice Note]");
        try {
          const res = await projectsApi.sendVoice(projectId, audioBlob);
          onAssistantReply(res.intent);
        } catch (err: any) {
          onAssistantReply("Error transcribing voice: " + err.message);
        } finally {
          setIsTyping(false);
        }
      };

      mediaRecorder.start();
      setIsVoiceRecording(true);
    } catch (err) {
      alert("Microphone access denied or not available");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsVoiceRecording(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* File Preview Area */}
      {(attachedFile || isRecording) && (
        <div className="flex items-center gap-2 p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg animate-in slide-in-from-bottom-2">
          {previewUrl ? (
            <img src={previewUrl} className="w-10 h-10 rounded object-cover" />
          ) : isRecording ? (
            <div className="w-10 h-10 rounded bg-red-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            </div>
          ) : (
            <FileText className="w-10 h-10 p-2 text-[#00DC82]" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {isRecording ? "Recording audio..." : attachedFile?.name}
            </p>
            <p className="text-[10px] text-[#52525B]">
              {isRecording ? "Transcribing live via Whisper" : `${mode.toUpperCase()} input mode`}
            </p>
          </div>
          <button 
            onClick={() => {
              setAttachedFile(null);
              setPreviewUrl(null);
              if (isRecording) stopRecording();
              setMode("text");
            }}
            className="p-1 hover:bg-[#2A2A2A] rounded"
          >
            <X className="w-4 h-4 text-[#52525B]" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-end gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2 focus-within:border-[#00DC82]/50 transition-all">
        <div className="flex gap-1 mb-1 px-1">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-[#52525B] hover:text-[#00DC82] hover:bg-[#00DC82]/10 rounded-lg transition-colors"
            title="Attach Screenshot or PDF"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-1.5 rounded-lg transition-colors ${
              isRecording ? "text-red-500 bg-red-500/10" : "text-[#52525B] hover:text-[#00DC82] hover:bg-[#00DC82]/10"
            }`}
            title="Record Voice Note"
          >
            <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
          </button>
        </div>

        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendText();
            }
          }}
          placeholder={isRecording ? "Speak now..." : "Describe a change or upload a spec..."}
          className="flex-1 bg-transparent border-0 resize-none py-1.5 text-sm text-[#F5F5F5] placeholder-[#52525B] focus:ring-0 min-h-[36px] max-h-32"
        />

        <button
          onClick={handleSendText}
          disabled={isTyping || (!input.trim() && !attachedFile) || isRecording}
          className="bg-[#00DC82] text-[#0A0A0A] p-2 rounded-lg hover:bg-[#00DC82]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
        >
          {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          className="hidden"
        />
      </div>
    </div>
  );
}
