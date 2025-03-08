'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Terminal, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PromptFormProps {
  socket: Socket | null;
  onSubmit: (prompt: string, terminalCount: number) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

export default function PromptForm({ 
  socket, 
  onSubmit, 
  isProcessing, 
  setIsProcessing 
}: PromptFormProps) {
  const [prompt, setPrompt] = useState('');
  const [terminalCount, setTerminalCount] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isProcessing || !socket) return;
    
    setIsProcessing(true);
    onSubmit(prompt.trim(), terminalCount);
    setPrompt('');
  };

  const handleCreateTerminals = () => {
    if (isProcessing || !socket) return;
    
    setIsProcessing(true);
    onSubmit('', terminalCount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6">
          <form id="prompt-form" className="space-y-6" onSubmit={handleSubmit}>
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4" />
                <span className="font-medium">
                  Terminal Count: {terminalCount}
                </span>
              </div>
              <Slider
                value={[terminalCount]}
                onValueChange={(value) => setTerminalCount(value[0])}
                min={1}
                max={10}
                step={1}
                disabled={isProcessing}
                className="w-full"
              />
            </motion.div>

            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Textarea
                id="prompt-input"
                placeholder="Ask Claude anything..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isProcessing}
                className="min-h-[120px] resize-none"
              />
              
              <motion.div 
                className="flex gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateTerminals}
                  disabled={isProcessing}
                  className="flex-1 relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {isProcessing ? (
                      <motion.div
                        key="creating"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center"
                      >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </motion.div>
                    ) : (
                      <motion.div
                        key="create"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center"
                      >
                        <Terminal className="mr-2 h-4 w-4" />
                        Create Terminals
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>

                <Button
                  type="submit"
                  disabled={isProcessing || !prompt.trim()}
                  className="flex-1 relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {isProcessing ? (
                      <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center"
                      >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </motion.div>
                    ) : (
                      <motion.div
                        key="execute"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Execute
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
} 