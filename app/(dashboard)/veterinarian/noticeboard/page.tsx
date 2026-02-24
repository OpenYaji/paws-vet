"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, AlertCircle, Info, Trash2 } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NoticeboardPage() {
    // Fetch notices with SWR
  const { data: notices = [], isLoading } = useSWR("/api/noticeboard", fetcher);
  const [isPosting, setIsPosting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");

  // Handle posting a new notice
  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);

    try {
      const res = await fetch("/api/noticeboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, priority }),
      });

      if (res.ok) {
        setTitle("");
        setContent("");
        setPriority("normal");
        mutate("/api/noticeboard"); // Refresh the list automatically
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (error) {
      alert("Failed to post notice.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-green-600" />
        <h1 className="text-3xl font-bold">Noticeboard</h1>
      </div>

      {/* Post Notice Form (Hide this wrapper if the user is a client) */}
      <Card className="bg-gray-50 border-dashed">
        <CardContent className="p-6">
          <form onSubmit={handlePostNotice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Notice Title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-2 p-2 border rounded-md"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="normal">Normal Priority</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <textarea
              placeholder="Write your announcement here..."
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border rounded-md h-24"
            />
            <Button
              type="submit"
              disabled={isPosting}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700"
            >
              {isPosting ? "Posting..." : "Post Notice"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notices List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">Loading notices...</p>
        ) : notices.length === 0 ? (
          <p className="text-gray-500 text-center py-8 border rounded-lg bg-gray-50">
            No announcements yet.
          </p>
        ) : (
          notices.map((notice: any) => (
            <Card
              key={notice.id}
              className={
                notice.priority === "urgent" ? "border-red-200 bg-red-50" : ""
              }
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {notice.priority === "urgent" && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    {notice.priority === "important" && (
                      <Info className="h-4 w-4 text-blue-600" />
                    )}
                    <CardTitle className="text-lg">{notice.title}</CardTitle>
                  </div>
                  <p className="text-xs text-gray-500">
                    Posted on{" "}
                    {format(new Date(notice.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                {notice.priority !== "normal" && (
                  <Badge
                    variant={
                      notice.priority === "urgent" ? "destructive" : "default"
                    }
                  >
                    {notice.priority}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {notice.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
