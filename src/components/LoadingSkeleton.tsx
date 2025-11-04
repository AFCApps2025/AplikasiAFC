import React from 'react';
import { Skeleton } from './ui/skeleton';

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="container mx-auto p-4 space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Booking list skeleton
export const BookingListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    ))}
  </div>
);

// Calendar skeleton
export const CalendarSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {[...Array(42)].map((_, i) => (
        <div key={i} className="aspect-square border rounded">
          <Skeleton className="h-full w-full" />
        </div>
      ))}
    </div>
  </div>
);

// Order history skeleton
export const OrderHistorySkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-32" />
    </div>
    {[...Array(8)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Technician dashboard skeleton
export const TechnicianDashboardSkeleton = () => (
  <div className="container mx-auto p-4 space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 bg-white/20" />
              <Skeleton className="h-8 w-12 bg-white/30" />
            </div>
            <Skeleton className="h-8 w-8 bg-white/20" />
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-12 ml-auto" />
          </div>
          <div className="text-center mb-4">
            <Skeleton className="h-12 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
          <div className="space-y-3">
            {[...Array(9)].map((_, j) => (
              <div key={j} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Work report form skeleton
export const WorkReportSkeleton = () => (
  <div className="max-w-4xl mx-auto p-4 space-y-6">
    <div className="bg-white rounded-lg shadow p-6">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="flex gap-4 mt-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  </div>
);
