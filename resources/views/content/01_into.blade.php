@extends('layouts.admin')

@section('title') Risk Premiums Explained @endsection
@section('contentheader') Dashboard @endsection
@section('contentheaderlink') <a href="#">Dashboard</a> @endsection
@section('contentheaderactive') Home @endsection    

@section('content')

  <style>
    body {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8f9fa;
      color: #333;
      line-height: 1.7;
      padding: 2rem;
      margin: 0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      margin-bottom: 2rem;
      font-size: 2.2rem;
    }
    .premium-item {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      border-left: 6px solid #2196F3;
      border-radius: 8px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .premium-item:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(33, 150, 243, 0.2);
    }
    .premium-title {
      font-weight: 700;
      font-size: 1.35rem;
      color: #1976d2;
      margin: 0 0 0.8rem 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .premium-title i {
      color: #1976d2;
      font-size: 1.5rem;
    }
    .premium-content {
      font-size: 1.05rem;
      color: #424242;
    }
    .highlight {
      background-color: #fff3e0;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      .container { padding: 1.5rem; }
      .premium-title { font-size: 1.25rem; }
    }
  </style>
</head>
<body>

<div class="container">
  <h1>Understanding Risk Premiums in Fixed Income</h1>

  <div class="premium-item">
    <h2 class="premium-title"><i class="fas fa-shield-alt"></i> The Real Risk-Free Interest Rate</h2>
    <div class="premium-content">
      The real risk-free interest rate is the <span class="highlight">single-period interest rate</span> for a completely risk-free security if no inflation were expected. In economic theory, the real risk-free rate reflects the time preferences of individuals for current versus future real consumption.
    </div>
  </div>

  <div class="premium-item">
    <h2 class="premium-title"><i class="fas fa-chart-line"></i> The Inflation Premium</h2>
    <div class="premium-content">
      The <span class="highlight">inflation premium</span> compensates investors for expected inflation and reflects the average inflation rate expected over the maturity of the debt. Inflation reduces the purchasing power of a unit of currency—the amount of goods and services one can buy with it.
    </div>
  </div>

  <div class="premium-item">
    <h2 class="premium-title"><i class="fas fa-exclamation-triangle"></i> The Default Risk Premium</h2>
    <div class="premium-content">
      The <span class="highlight">default risk premium</span> compensates investors for the possibility that the borrower will fail to make a promised payment at the contracted time and in the contracted amount.
    </div>
  </div>

  <div class="premium-item">
    <h2 class="premium-title"><i class="fas fa-clock"></i> The Liquidity Premium</h2>
    <div class="premium-content">
      The <span class="highlight">liquidity premium</span> compensates investors for the risk of loss relative to an investment’s fair value if the investment needs to be converted to cash quickly. US Treasury bills (T-bills), for example, do not bear a liquidity premium because large amounts of them can be bought and sold without affecting their market price. Many bonds of small issuers, by contrast, trade infrequently after they are issued; the interest rate on such bonds includes a liquidity premium reflecting the relatively high costs (including the impact on price) of selling a position.
    </div>
  </div>

  <div class="premium-item">
    <h2 class="premium-title"><i class="fas fa-calendar-alt"></i> The Maturity Premium</h2>
    <div class="premium-content">
      The <span class="highlight">maturity premium</span> compensates investors for the increased sensitivity of the market value of debt to a change in market interest rates as maturity is extended, in general (holding all else equal). The difference between the interest rate on longer-maturity, liquid Treasury debt and that on short-term Treasury debt typically reflects a positive maturity premium for the longer-term debt (and possibly different inflation premiums as well).
    </div>
  </div>
</div>

</body>
</html>
@endsection