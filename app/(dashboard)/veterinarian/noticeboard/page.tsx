"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Megaphone, AlertCircle, Info, Trash2, Edit, Eye } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NoticeboardPage() {
  const { data: notices = [], isLoading } = useSWR("/api/noticeboard", fetcher);

  // Post states
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");

  // View & Edit Modal states
  const [viewNotice, setViewNotice] = useState<any>(null);
  const [editNotice, setEditNotice] = useState<any>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [isUpdating, setIsUpdating] = useState(false);

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
        mutate("/api/noticeboard");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      const res = await fetch(`/api/noticeboard?id=${id}`, { method: "DELETE" });
      if (res.ok) mutate("/api/noticeboard");
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (notice: any) => {
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditPriority(notice.priority);
    setEditNotice(notice);
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch("/api/notices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editNotice.id,
          title: editTitle,
          content: editContent,
          priority: editPriority,
        }),
      });
      if (res.ok) {
        setEditNotice(null);
        mutate("/api/notices");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-green-600" />
        <h1 className="text-3xl font-bold">Noticeboard</h1>
      </div>

      {/* Post Notice Form */}
      <Card className="bg-gray-50 border-dashed border-2">
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
                    className="uppercase"
                  >
                    {notice.priority}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-2">
                  {notice.content}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2 border-t mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewNotice(notice)}
                >
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(notice)}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(notice.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* ── VIEW MODAL ── */}
      <Dialog open={!!viewNotice} onOpenChange={() => setViewNotice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              {viewNotice?.priority !== "normal" && (
                <Badge
                  variant={
                    viewNotice?.priority === "urgent"
                      ? "destructive"
                      : "default"
                  }
                  className="uppercase"
                >
                  {viewNotice?.priority}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-2xl">{viewNotice?.title}</DialogTitle>
            <DialogDescription>
              Posted on{" "}
              {viewNotice &&
                format(new Date(viewNotice.created_at), "MMMM d, yyyy h:mm a")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 whitespace-pre-wrap text-gray-800">
            {viewNotice?.content}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewNotice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT MODAL ── */}
      <Dialog open={!!editNotice} onOpenChange={() => setEditNotice(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Notice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateNotice} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="col-span-2 p-2 border rounded-md w-full"
              />
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="p-2 border rounded-md w-full"
              >
                <option value="normal">Normal Priority</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <textarea
              required
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border rounded-md h-32"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditNotice(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
