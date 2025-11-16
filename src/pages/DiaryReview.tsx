import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function DiaryReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // DiaryReview는 이제 Upload 페이지로 통합됨
    navigate(`/upload/${id}`, { replace: true });
  }, [id, navigate]);

  return null;
}
