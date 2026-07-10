"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SubmitSalaryModal({ countries }: { countries: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controlled state for dropdowns
  const [countryId, setCountryId] = useState(countries[0]?.id || "");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [currency, setCurrency] = useState("USD");
  
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      jobTitle: formData.get("jobTitle"),
      employerName: formData.get("employerName"),
      countryId,
      experienceLevel,
      employmentType,
      currency,
      grossMonthlySalary: Number(formData.get("grossMonthlySalary")),
      netMonthlySalary: formData.get("netMonthlySalary") ? Number(formData.get("netMonthlySalary")) : undefined,
      yearsOfExperience: formData.get("yearsOfExperience") ? Number(formData.get("yearsOfExperience")) : undefined,
    };

    try {
      const res = await fetch("/api/salaries/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit salary");
      }

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
        <Plus className="h-4 w-4" />
        Submit a Salary
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit a Salary</DialogTitle>
          <DialogDescription>
            Contribute to the largest open salary database in East Africa. Your submission is 100% anonymous.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title <span className="text-red-500">*</span></Label>
              <Input id="jobTitle" name="jobTitle" required placeholder="e.g. Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employerName">Employer <span className="text-red-500">*</span></Label>
              <Input id="employerName" name="employerName" required placeholder="e.g. Safaricom" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="countryId">Country <span className="text-red-500">*</span></Label>
              <Select value={countryId} onValueChange={(val) => val && setCountryId(val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Experience Level <span className="text-red-500">*</span></Label>
              <Select value={experienceLevel} onValueChange={(val) => val && setExperienceLevel(val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type <span className="text-red-500">*</span></Label>
              <Select value={employmentType} onValueChange={(val) => val && setEmploymentType(val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="consultancy">Consultancy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" placeholder="e.g. 5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
              <Select value={currency} onValueChange={(val) => val && setCurrency(val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="TZS">TZS</SelectItem>
                  <SelectItem value="UGX">UGX</SelectItem>
                  <SelectItem value="RWF">RWF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="grossMonthlySalary">Gross Monthly Salary <span className="text-red-500">*</span></Label>
              <Input id="grossMonthlySalary" name="grossMonthlySalary" type="number" min="0" required placeholder="Before taxes" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Anonymously
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
