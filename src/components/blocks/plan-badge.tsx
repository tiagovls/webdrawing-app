"use client"

import { useState, useEffect } from "react"
import { getUserPlan } from "@/app/actions"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

export function PlanBadge() {
  const [plan, setPlan] = useState<"Free" | "Pro" | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { userId, isLoaded, getToken } = useAuth()

  useEffect(() => {
    async function fetchPlan() {
      if (isLoaded && userId) {
        const data = await getUserPlan(userId)
        setPlan(data.plan as "Free" | "Pro")
      }
    }
    fetchPlan()
  }, [isLoaded, userId])

  const handleClick = async () => {
    if (plan === "Free") {
      router.push("/#pricing")
      return
    }
    
    try {
      setIsLoading(true)
      const token = await getToken()
      const res = await fetch("/api/stripe/portal", { 
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Portal error:", error)
      setIsLoading(false)
    }
  }

  if (!plan) return null

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all border ${
        plan === "Pro" 
          ? "bg-brand-100 text-brand-700 border-brand-200 hover:bg-brand-200" 
          : "bg-surface-100 text-dark-600 border-surface-200 hover:bg-surface-200"
      }`}
    >
      {isLoading ? "..." : plan}
    </button>
  )
}
