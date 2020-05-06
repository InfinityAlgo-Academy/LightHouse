# Lighthouse Scores

The goal of this document is to explain how scoring works in Lighthouse and what to do to improve your Lighthouse scores.

If you want a more comprehensive spreadsheet of this document to understand weighting and scoring, check out the [scoring spreadsheet](https://docs.google.com/spreadsheets/d/1up5rxd4EMCoMaxH8cppcK1x76n6HLx0e7jxb0e0FXvc):

<a href="https://docs.google.com/spreadsheets/d/1up5rxd4EMCoMaxH8cppcK1x76n6HLx0e7jxb0e0FXvc" target="_blank"><img alt="Click image to open scoring spreadsheet in new browser tab." src="https://user-images.githubusercontent.com/39191/32397461-2d20c87a-c0a7-11e7-99d8-61576113a710.png"></a>

Note: receiving a **score of ?** in any Lighthouse category indicates an error occurred. Please file an [issue](https://github.com/GoogleChrome/lighthouse/issues) with proper [bug labels](./bug-labels.md) so our team can look into it.

# Performance

### What performance metrics does Lighthouse measure?

Lighthouse measures the following performance metrics:

| Metric | Description |
| - | - |
| [First Contentful Paint](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#first_paint_and_first_contentful_paint) | The first time the browser paints any content (text, image, canvas, etc) on the screen. |
| [First Meaningful Paint](https://web.dev/first-meaningful-paint) | When the browser first puts any “meaningful” element / set of “meaningful” elements on the screen. What is meaningful is determined from a series of heuristics . |
| [First CPU Idle](https://web.dev/first-cpu-idle) | The first point at which the page could respond quickly to input. It doesn't consider any point in time before first meaningful paint. The way this is implemented is primarily based on heuristics. *Note: this metric is currently in beta, which means that the underlying definition of this metric is in progress.* |
| [Time to Interactive](https://web.dev/interactive) | The first point at which everything is loaded, such that the page will quickly respond to any user input throughout the page. *Note: this metric is currently in beta, which means that the underlying definition of this metric is in progress.* |
| [Speed Index](https://web.dev/speed-index) | Speed Index measures how quickly all above-the-fold content is painted on screen. The earlier the pixels are painted, the better you score on metric. Users want an experience where most of the content is shown on the screen during the first few moments of initiating the page load. Loading more content earlier makes your end user feel like the website is loading quickly, which contributes to a positive user experience. Therefore, the lower your Speed Index, the better. |
| [Estimated Input Latency](https://web.dev/estimated-input-latency) | Measures how fast your app is in responding to user input. Our benchmark is that the estimated input latency should be under 50 ms. |

*Some **variability** when running on real-world sites is to be expected as sites load different ads, scripts, and network conditions vary for each visit. Note that Lighthouse can especially experience inconsistent behaviors when it runs in the presence of anti-virus scanners, other extensions or programs that interfere with page load, and inconsistent ad behavior. Please try to run without anti-virus scanners or other extensions/programs to get the cleanest results, or alternatively, run Lighthouse on [WebPageTest]https://www.webpagetest.org/easy.php) for the most consistent results.*

### How are the scores weighted?

Lighthouse returns a performance score from 0-100 (technically stored as a decimal, but formatted in reports for readability). A score of 0 usually indicates an error with performance measurement, and 100 is the best possible score (very difficult to achieve). Usually, any score above a 90 gets you in the top ~5% of performant websites.

The performance score is determined from the **performance metrics only**. The Opportunities / Diagnostics sections do not directly contribute to the performance score.

The metric results are not weighted equally. Currently the weights are:

* 3x - first contentful paint
* 1x - first meaningful paint
* 2x - first cpu idle
* 5x - time to interactive
* 4x - speed index
* 0x - estimated input latency

These weights are heuristics, and the Lighthouse team is working on formalizing the weighting system through more field data.

### How do performance metrics get scored?

Once Lighthouse is done gathering the raw performance metrics for your website (metrics reported in milliseconds), it converts them into a score by mapping the raw performance number to a number between 0-100 by looking where your raw performance metric falls on the Lighthouse scoring distribution. The Lighthouse scoring distribution is a log normal distribution that is derived from the performance metrics of real website performance data ([example sample distribution](https://www.desmos.com/calculator/zrjq6v1ihi)).

Once it finishes computing the percentile equivalent of your raw performance score, it takes the weighted average of all the performance metrics (per the weighting above). Finally, it applies a coloring to the score (green, orange, and red) depending on what "bucket" your score falls in. This maps to:
- Red (poor score): 0-49
- Orange (average): 50-89
- Green (good): 90-100

### What can developers do to improve their performance score?

*Note: the Lighthouse team has built [a helpful calculator](https://docs.google.com/spreadsheets/d/1up5rxd4EMCoMaxH8cppcK1x76n6HLx0e7jxb0e0FXvc/edit#gid=0) that can help you understand what thresholds you should be aiming for, to achieve a certain Lighthouse performance score.*

Lighthouse has an “Opportunities” report section, with suggestions for improving your performance score. There is detailed documentation that explains the different suggestions and how to implement them. Additionally, the "Diagnostics" section lists additional guidance that developers can explore to further experiment and tweak their performance.

# PWA

### How is the PWA (Progressive Web App) score calculated?

The PWA score is calculated based on the [Baseline PWA checklist](https://developers.google.com/web/progressive-web-apps/checklist#baseline), which lists 14 requirements. Lighthouse tests for 11 out of the 14 requirements automatically, with the other 3 being manual checks. Each of the 11 audits for the PWA section of the report are weighted equally, so implementing any of the audits correctly will increase your overall score by ~9 points.

Note on https redirects: some metrics in this category have issues with https redirects because of TLS-handshake errors. More specifically you will run into this when using the ```simplehttp2server``` npm package. Subsequent metrics will fail after the https redirects (see [#1217](https://github.com/GoogleChrome/lighthouse/issues/1217), [#5910](https://github.com/GoogleChrome/lighthouse/issues/5910)).

# Accessibility

### How is the accessibility score calculated?
The accessibility score is a weighted average of all the different audits (the weights for each audit can be found in [the scoring spreadsheet](https://docs.google.com/spreadsheets/d/1Cxzhy5ecqJCucdf1M0iOzM8mIxNc7mmx107o5nj38Eo/edit#gid=0)). Each audit is a pass/fail (meaning there is no room for partial points for getting an audit half-right). For example, that means if half your buttons have screenreader friendly names, and half do not, you don't get "half" of the weighted average - you get a 0 because it needs to be implemented correctly *throughout* the page.

# Best Practices
### How is the Best Practices score calculated?
Each audit in the Best Practices section is equally weighted. Therefore, implementing each audit correctly will increase your overall score by ~6 points.
