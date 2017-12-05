# Lantern

## Overview

Project Lantern is an ongoing effort to reduce the run time of Lighthouse and improve audit quality by modeling page activity and simulating browser execution. This document details the accuracy of these models and captures the expected natural variability.

## Accuracy

All of the following accuracy stats are reported on a set of 1500 URLs sampled from the Alexa top 1000, HTTPArchive dataset, and miscellaneous ad landing pages. Trace and load data were collected for *a single run* in one environment and compared to the trace and load data of *a single run* in a second environment. Some natural variation is expected and is captured by the reference stats in the table below. The most errant 10% of observations were excluded from all comparisons as outliers. For more on the methodology and reasoning, see the [Lantern design doc](https://docs.google.com/a/chromium.org/document/d/1pHEjtQjeycMoFOtheLfFjqzggY8VvNaIRfjC7IgNLq0/edit?usp=sharing).

Stats were collected using the [trace-evaluation](https://github.com/patrickhulce/lighthouse-trace-evaluations) scripts. Table cells contain [Spearman's rho](https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient) and [MAPE](https://en.wikipedia.org/wiki/Mean_absolute_percentage_error) for the respective metric.

### Accuracy Stats
| Comparison | FCP | FMP | TTI |
| -- | -- | -- | -- |
| Lantern predicting Default LH | .850 : 19.6% | .866 : 21.0% | .907 : 26.9% |
| Lantern predicting LH on WPT | .764 : 34.4% | .795 : 32.5% | .879 : 33.1% |
| Lantern w/adjusted settings<sup>1</sup> predicting LH on WPT | .769 : 32.9% | .808 : 31.1% | .879 : 32.6% |

### Reference Stats
| Comparison | FCP | FMP | TTI |
| -- | -- | -- | -- |
| Unthrottled LH correlation with Unthrottled LH<sup>2</sup> | .881 : 30.8% | .860 : 30.0% | .845 : 36.5% |
| WPT correlation with WPT | .805 : 28.7% | .823 : 30.57% | .795 : 43.7% |
| Default LH correlation with LH on WPT<sup>2</sup> | .808 : 30.0% | .818 : 31.3% | .819 : 39.5% |
| Unthrottled LH correlation with LH on WPT | .643 : 36.3% | .625 : 40.1% | .731 : 58.4% |

<sup>1</sup> 320 ms RTT, 1.3 mbps, 5x CPU

<sup>2</sup> Two trace sets were captured several weeks apart, so some site changes may have occurred that skew these stats

## Conclusions

### Lantern Accuracy Conclusions

* For the single view use case, we conclude that Lantern is roughly as accurate at predicting the rank of a website the next time you visit it as the metrics themselves. That is to say, the average error we observe between a Lantern performance score and a LH on DevTools performance score is within the expectation for standard deviation, which is the highest goal we set out to achieve. As a sanity check, we also see that using the unthrottled metrics to predict throttled performance has a significantly lower correlation than Lantern does.
* For the repeat view use case, we require more data to reach a conclusion, but the high correlation of the single view use case suggests the accuracy meets our correlation requirements even if some sites may diverge.

### Metric Variability Conclusions
The reference stats demonstrate that there is high degree of variability with the user-centric metrics and strengthens the position that every load is just an observation of a point drawn from a distribution and to understand the entire experience, multiple draws must be taken, i.e. multiple runs are needed to have sufficiently small error bounds on the median load experience.

## Future Work
Conducting this same analysis with a 3/5/9/21 run dataset blocks much of the future work here. Future investments in Lantern accuracy would be ill-spent without this larger dataset to validate their efficacy.

## Links

* [Lantern Deck](https://docs.google.com/presentation/d/1EsuNICCm6uhrR2PLNaI5hNkJ-q-8Mv592kwHmnf4c6U/edit?usp=sharing)
* [Lantern Design Doc](https://docs.google.com/a/chromium.org/document/d/1pHEjtQjeycMoFOtheLfFjqzggY8VvNaIRfjC7IgNLq0/edit?usp=sharing)
* [WPT Trace Data Set Half 1](https://drive.google.com/open?id=1Y_duiiJVljzIEaYWEmiTqKQFUBFWbKVZ) (access on request)
* [WPT Trace Data Set Half 2](https://drive.google.com/open?id=1EoHk8nQaBv9aoaVv81TvR7UfXTUu2fiu) (access on request)
* [Unthrottled Trace Data Set Half 1](https://drive.google.com/open?id=1axJf9R3FPpzxhR7FKOvXPLFLxxApfwD0) (access on request)
* [Unthrottled Trace Data Set Half 2](https://drive.google.com/open?id=1krcWq5DF0oB1hq90G29bEwIP7zDcJrYY) (access on request)
