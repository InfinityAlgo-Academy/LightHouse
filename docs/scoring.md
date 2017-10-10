# Goal

The goal of this document is to explain how scoring on Lighthouse works, and how to understand what to do to improve your
Lighthouse score. 

# What metrics does Lighthouse measure?

Lighthouse primarily measures the following metrics: 

- First meaningful paint: first meaningful paint is defined as when the browser first puts any “meaningful” element/set of “meaningful” elements  on the screen. What is meaningful is determined from a series of heuristics. 
- First interactive: first interactive is defined as the first point at which the page could respond quickly to input. It doesn't consider any point in time before first meaningful paint. The way this is implemented is primarily based on heuristics. 
*Note: this metric is currently in beta, which means that the underlying definition of this metric is in progress.*
- Consistently interactive: defined as that everything is loaded such that the page will quickly respond to any user input throughout the page. 
*Note: this metric is currently in beta, which means that the underlying definition of this metric is in progress.*
- Perceptual Speed Index (pSI): pSI measures how many pixels are painted at each given time interval on the viewport. The fewer the pixels that are painted, the better since we want an experience where most of the content is shown on the screen during the first few moments of initiating the page load. Therefore, the lower the pSI score, the better. 
- Estimated Input Latency:  this audit measures how fast your app is in responding to user input. Our benchmark is that the estimated input latency should be under 50 ms (see documentation here as to why)

# How are the scores weighted?
Lighthouse returns a performance score from 0-100. A score of 0 usually indicates an error with performance measurement (so file an issue in the Lighthouse repo if further debugging is needed), and 100 is the best possible ideal score (really hard to get). 
We usually recommend that if developers are scoring around a 95, their websites are extremely performant. Any additional improvements to the score past 95 doesn’t add additional value for the developer, so we don’t recommend they invest further time to improve the score. 

The performance score is determined from the performance metrics only. The Opportunities/Diagnostics sections do not directly contribute to the performance score.

The metric results are not weighted equally. Currently the weights are:
5X - first meaningful paint
5X - first interactive
5X - consistently interactive
1X - perceptual speed index
1X - estimated input latency

Currently, these weights were determined based on heuristics, and the Lighthouse team is working on formalizing this approach through more field data.  

# How do you determine the optimal and median value calculated?
Looking at the distribution of metrics like Time to Consistently Interactive (TTCI) over the HTTPArchive dataset, we've seen that the median value of this distribution ends up being around 10 seconds, which is why the value of 12 seconds exists within the dataset. Given that we want to encourage web developers to build fast websites, we've shifted the median slightly to the left by 2 seconds to give a final median value of 10 seconds. Similarly, for the optimal value, we look at the curve to see where the curve flattens out, meaning that as a developer, every second you shave off the performance doesn't yield additional benefit. We've determined this point for TTCI to be around 3 seconds. 

# What can developers do to improve their performance metrics?
Lighthouse has a whole section in the report on this under the “Opportunities” section. There are detailed suggestions and documentation that explains the different suggestions there. Additionally, the diagnostics section lists additional guidance that developers can explore to further experiment and tweak with their performance, but the opportunities section will provide the most actionable advice for developers to follow. 
