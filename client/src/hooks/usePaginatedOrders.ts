import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface PaginatedOrdersResult {
  orders: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export const usePaginatedOrders = (initialPage: number = 1, pageSize: number = 15) => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const { data, isLoading, error, refetch } = useQuery<PaginatedOrdersResult>({
    queryKey: ['/api/orders/paginated', currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/orders/paginated?page=${currentPage}&limit=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch paginated orders');
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    refetchInterval: false, // Disable polling - using SSE for real-time updates
    refetchOnWindowFocus: false,
  });

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (data && currentPage < data.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    if (data) {
      setCurrentPage(data.totalPages);
    }
  };

  return {
    orders: data?.orders || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    currentPage,
    isLoading,
    error,
    refetch,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage: data ? currentPage < data.totalPages : false,
    hasPreviousPage: currentPage > 1,
  };
};