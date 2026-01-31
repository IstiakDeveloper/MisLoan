@component('mail::message')

# ⚠️ নতুন সমস্যা রিপোর্ট

{{ $branchName }} শাখার জন্য নতুন {{ $applicationType === 'admission' ? 'ভর্তি' : 'ঋণ' }} আবেদনে সমস্যা পাওয়া গেছে।

## 📋 আবেদনের তথ্য
- **আবেদন নম্বর:** {{ $applicationNo }}
- **ধরন:** {{ ucfirst($applicationType) }}
- **মোট সমস্যা:** {{ $totalIssues }}

## ⚠️ সমস্যার সারাংশ

@if($criticalCount > 0)
**🔴 গুরুত্বপূর্ণ:** {{ $criticalCount }} টি সমস্যা দ্রুত সমাধান করা প্রয়োজন
@endif

@if($warningCount > 0)
**🟡 সতর্কতা:** {{ $warningCount }} টি সমস্যা সমাধান করতে হবে
@endif

@if($infoCount > 0)
**🔵 তথ্য:** {{ $infoCount }} টি সমস্যা মনোযোগ দাবি করে
@endif

## 📝 সমস্যার বিস্তারিত

@forelse($issues as $memberName => $memberIssues)

### সদস্য: {{ $memberName }}

@foreach($memberIssues as $issue)
- **{{ $issue['issue_type'] }}** ({{ $issue['severity'] }})
  - {{ $issue['issue_description'] }}
@endforeach

@empty
কোনো সমস্যা পাওয়া যায়নি।
@endforelse

## 📊 পরবর্তী পদক্ষেপ

1. আপনার শাখার সিস্টেমে লগইন করুন
2. চিহ্নিত সমস্যাগুলি দেখুন
3. প্রয়োজনীয় সংশোধন করুন এবং পুনরায় জমা দিন
4. Head Office-কে আপডেট জানাবে

@component('mail::button', ['url' => $dashboardLink])
📊 ড্যাশবোর্ড দেখুন
@endcomponent

ধন্যবাদ,
{{ config('app.name') }} টিম

@endcomponent
