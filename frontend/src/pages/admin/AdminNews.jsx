import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import {
  Newspaper,
  Search,
  Trash2,
  Calendar,
  User,
  PlusCircle,
  Edit,
  X,
  Image as ImageIcon,
  Upload
} from "lucide-react";
import Pagination from "../../components/Pagination";

// Import React Quill (react-quill-new supports React 19)
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

export default function AdminNews() {
  const [newsList, setNewsList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  // States cho Form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("Admin");

  // File ảnh
  const [imageFile, setImageFile] = useState(null);
  // Lưu URL ảnh cũ hoặc Preview để hiển thị
  const [imagePreview, setImagePreview] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  
  // Hàm tạo link ảnh đầy đủ (cho ảnh lưu thư mục /uploads)
  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `http://localhost:5000${url}`;
  };

  // 1. Fetch Data
  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await API.get("/news");
      setNewsList(res.data);
      setFiltered(res.data);
    } catch {
      toast.error("❌ Lỗi tải danh sách tin tức");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // 2. Filter Logic
  useEffect(() => {
    const keyword = search.toLowerCase();
    const result = newsList.filter(
      (n) => n.title?.toLowerCase().includes(keyword)
    );
    setFiltered(result);
    setPage(1);
  }, [search, newsList]);

  // 3. Delete Handler
  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa bản tin này không?")) {
      try {
        await API.delete(`/news/${id}`);
        toast.success("🗑️ Đã xóa tin tức");
        fetchNews();
      } catch {
        toast.error("❌ Xóa thất bại");
      }
    }
  };

  // 4. Mở modal Sửa
  const handleEdit = (item) => {
    setEditItem(item);
    setTitle(item.title);
    setDesc(item.desc);
    setContent(item.content);
    setAuthor(item.author);
    
    // Xóa file cũ trong state
    setImageFile(null);
    setImagePreview(getImageUrl(item.image));
    
    setIsModalOpen(true);
  };

  // 5. Mở modal Thêm
  const handleAdd = () => {
    setEditItem(null);
    setTitle("");
    setDesc("");
    setContent("");
    setAuthor("Admin");
    
    setImageFile(null);
    setImagePreview("");
    setIsModalOpen(true);
  };

  // 6. Xử lý Image Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        return toast.error("Vui lòng chỉ chọn tệp hình ảnh");
      }
      if (file.size > 5 * 1024 * 1024) {
        return toast.error("Hình ảnh vượt quá 5MB");
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 7. Submit lưu
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Vui lòng nhập tiêu đề");

    // Dùng FormData vì có upload file
    const formData = new FormData();
    formData.append("title", title);
    formData.append("desc", desc);
    formData.append("content", content);
    formData.append("author", author);
    
    // Nếu có file do user mới chọn
    if (imageFile) {
      formData.append("imageFile", imageFile);
    } else if (editItem && editItem.image) {
      // Nếu user giữ nguyên ảnh cũ không sửa, ta đưa lại chuỗi URL
      // để Backend set lại "image": req.body.image
      formData.append("image", editItem.image);
    }

    try {
      if (editItem) {
        await API.put(`/news/${editItem.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Cập nhật tin tức thành công");
      } else {
        await API.post("/news", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Đăng tin tức thành công");
      }
      setIsModalOpen(false);
      fetchNews();
    } catch (error) {
      console.error("Lỗi submit tin tức:", error);
      toast.error(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentNews = filtered.slice(startIndex, startIndex + itemsPerPage);

  const quillRef = useRef(null);

  const handleQuillImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          return toast.error("Hình ảnh vượt quá 5MB");
        }
        const formData = new FormData();
        formData.append("image", file);
        try {
          const res = await API.post("/news/upload-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const url = getImageUrl(res.data.url);
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", url);
          quill.setSelection(range.index + 1);
        } catch (error) {
          toast.error("Tải ảnh lên thất bại");
        }
      }
    };
  }, []);

  // Cấu hình thanh công cụ của React-Quill
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
      ],
      handlers: {
        image: handleQuillImageUpload
      }
    }
  }), [handleQuillImageUpload]);

  const quillFormats = [
    "header", "bold", "italic", "underline", "strike", "blockquote",
    "color", "background", "list", "bullet", "link", "image"
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans relative">
      {!isModalOpen ? (
        <>
          {/* HEADER & SEARCH */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
            <Newspaper className="text-orange-500" size={24} /> Quản lý Tin tức
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tổng số: <span className="font-bold text-[#113e48]">{filtered.length}</span> bài viết
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm tên bài viết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-[#113e48] hover:bg-[#0d2f36] text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all shrink-0"
          >
            <PlusCircle size={18} />
            Đăng tin mới
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 w-16">Hình ảnh</th>
                <th className="px-6 py-4 w-1/3">Tiêu đề bài viết</th>
                <th className="px-6 py-4">Tác giả</th>
                <th className="px-6 py-4 text-center">Bình luận</th>
                <th className="px-6 py-4 text-center">Ngày đăng</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : currentNews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">
                    Chưa có bài viết nào được đăng.
                  </td>
                </tr>
              ) : (
                currentNews.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {n.image ? (
                        <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
                          <img src={getImageUrl(n.image)} alt="ảnh" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#113e48] line-clamp-2" title={n.title}>
                        {n.title}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit text-xs font-medium">
                        <User size={12} /> {n.author}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-500">
                      {n.comments || 0}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 text-xs flex justify-center items-center h-full">
                      <div className="flex items-center justify-center gap-1 mt-3">
                        <Calendar size={12} />
                        {new Date(n.created_at).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(n)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Sửa bản tin"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Xóa bản tin"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col relative animate-in slide-in-from-right-8 fade-in-0 duration-500 min-h-[80vh]">
          {/* FULL PAGE FORM */}
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white/95 backdrop-blur z-10 rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-[#113e48] flex items-center gap-2">
                <Newspaper className="text-orange-500" />
                {editItem ? "Chỉnh sửa bài viết" : "Đăng bài viết mới"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiêu đề bài viết <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề thu hút..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-[#113e48]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tác giả</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="VD: Admin, Trưởng nhóm"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ảnh bìa (Cover Image)</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors text-sm font-bold w-full">
                      <Upload size={16} /> Chọn ảnh từ máy
                      <input 
                        type="file" 
                        accept="image/jpeg, image/png, image/webp" 
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Ảnh */}
              {imagePreview && (
                <div className="w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative group flex justify-center py-4">
                  <img src={imagePreview} alt="Preview" className="max-w-full h-auto max-h-[400px] object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Ảnh hiển thị</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mô tả ngắn (Trang chủ)</label>
                <textarea
                  rows="5"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Đoạn giới thiệu ngắn gọn tóm tắt nội dung..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                ></textarea>
              </div>

              <div className="space-y-1 flex-1 flex flex-col min-h-[300px]">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nội dung chi tiết (Rich Text)</label>
                {/* Bọc ReactQuill bằng một div h-full để nó giãn nở */}
                <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-orange-300 transition-colors focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 flex flex-col">
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={quillModules}
                    formats={quillFormats}
                    className="flex-1 flex flex-col h-full quill-editor"
                    placeholder="Soạn thảo nội dung chuyên nghiệp tại đây..."
                  />
                </div>
              </div>

              {/* Tùy chỉnh CSS cho Quill */}
              <style dangerouslySetInnerHTML={{__html: `
                .quill-editor .ql-container {
                   font-family: inherit;
                   font-size: 15px;
                   border: none !important;
                   flex: 1;
                   background: #fafafa;
                }
                .quill-editor .ql-toolbar {
                   border: none !important;
                   border-bottom: 1px solid #e5e7eb !important;
                   background: white;
                }
                .quill-editor .ql-editor {
                   min-height: 250px;
                }
              `}} />

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-2xl shrink-0">
                  {editItem && (
                    <a
                      href={`/news/${editItem.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors mr-auto flex items-center gap-2"
                    >
                      <Newspaper size={16} /> Xem bài viết
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30 rounded-xl transition-all hover:-translate-y-0.5"
                  >
                    {editItem ? "Lưu thay đổi" : "Xuất bản bài viết"}
                  </button>
              </div>

            </form>
            
        </div>
      )}
    </div>
  );
}
