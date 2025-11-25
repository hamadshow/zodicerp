@extends('layouts.admin')

@section('title') Rates of Return | CFA Level 1 @endsection
@section('contentheader') Rates of Return | CFA Level 1 @endsection
@section('contentheaderlink') <a href="#">Dashboard</a> @endsection
@section('contentheaderactive') Home @endsection    

@section('content')

  
  <style>
    body {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: #f8f9fa;
      color: #333;
      line-height: 1.8;
      margin: 0;
      padding: 2rem;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 2.6rem;
      color: #1a5fb4;
      text-align: center;
      margin-bottom: 2.5rem;
      border-bottom: 4px solid #4CAF50;
      padding-bottom: 0.8rem;
    }
    .objective {
      background: #e3f2fd;
      border-left: 6px solid #1a5fb4;
      padding: 1.2rem 1.5rem;
      margin: 2rem 0;
      border-radius: 0 8px 8px 0;
      font-size: 1.1rem;
    }
    .objective i {
      color: #1a5fb4;
      margin-right: 10px;
    }
    h2 {
      color: #2e7d32;
      font-size: 1.9rem;
      margin-top: 3rem;
      margin-bottom: 1rem;
      border-bottom: 2px solid #c8e6c9;
      padding-bottom: 0.5rem;
    }
    p {
      font-size: 1.1rem;
      margin-bottom: 1.2rem;
    }
    .highlight {
      background: #fff8e1;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      color: #ff6f00;
    }
    .note {
      background: #f1f8e9;
      border-left: 6px solid #7cb342;
      padding: 1.2rem;
      margin: 1.5rem 0;
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    @media (max-width: 768px) {
      .container { padding: 2rem; }
      h1 { font-size: 2.2rem; }
    }
  </style>
</head>
<body>

<div class="container">
  <h1>RATES OF RETURN</h1>

  <div class="objective">
    <i class="fas fa-check-circle"></i>
    Calculate and interpret different approaches to return measurement over time and describe their appropriate uses
  </div>

  <p>
    Financial assets are frequently defined in terms of their <strong>return and risk characteristics</strong>. 
    Comparison along these two dimensions simplifies the process of building a portfolio from among all available assets. 
    In this lesson, we will compute, evaluate, and compare various measures of return.
  </p>

  <p>
    Financial assets normally generate <strong>two types of return</strong> for investors. 
    First, they may provide periodic income through cash dividends or interest payments. 
    Second, the price of a financial asset can increase or decrease, leading to a <strong>capital gain or loss</strong>.
  </p>

  <div class="note">
    Some financial assets provide return through only one of these mechanisms. 
    For example, investors in non-dividend-paying stocks obtain their return from price movement only. 
    Others assets only generate periodic income. 
    For example, defined benefit pension plans and retirement annuities make income payments over the life of the beneficiary.
  </div>

  <h2>Holding Period Return</h2>

  <p>
    Returns can be measured over a <strong>single period</strong> or over <strong>multiple periods</strong>. 
    Single-period returns are straightforward because there is only one way to calculate them. 
    Multiple-period returns, however, can be calculated in various ways and it is important to be aware of these differences to avoid confusion.
  </p>

</div>

</body>

@endsection