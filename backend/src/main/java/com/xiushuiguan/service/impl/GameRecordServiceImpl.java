package com.xiushuiguan.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiushuiguan.dto.GameResultDTO;
import com.xiushuiguan.entity.GameRecord;
import com.xiushuiguan.entity.User;
import com.xiushuiguan.mapper.GameRecordMapper;
import com.xiushuiguan.service.GameRecordService;
import com.xiushuiguan.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
public class GameRecordServiceImpl extends ServiceImpl<GameRecordMapper, GameRecord> implements GameRecordService {

    @Autowired
    private UserService userService;

    /** 奖励配置：每星级对应的基础金币 [1星, 2星, 3星] */
    private static final int[] COINS_PER_STAR = {5, 15, 30};
    /** 每关额外金币乘数 */
    private static final int[] LEVEL_BONUS = {0, 1, 2};
    /** 首次通关额外金币 */
    private static final int FIRST_CLEAR_BONUS = 20;

    @Override
    public GameRecord submitResult(GameResultDTO dto) {
        GameRecord record = new GameRecord();
        record.setUserId(dto.getUserId());
        record.setLevel(dto.getLevel());
        record.setStars(dto.getStars() != null ? dto.getStars() : 0);
        record.setTimeUsed(dto.getTimeUsed() != null ? dto.getTimeUsed() : 0);
        record.setIsWin(dto.getIsWin() != null ? dto.getIsWin() : false);
        record.setFailReason(dto.getFailReason());
        record.setScore(dto.getScore() != null ? dto.getScore() : 0);
        record.setCreatedAt(LocalDateTime.now());
        save(record);

        if (dto.getIsWin() != null && dto.getIsWin()) {
            User user = userService.getById(dto.getUserId());
            if (user != null) {
                // 更新星数
                int stars = dto.getStars() != null ? dto.getStars() : 0;
                int newStars = user.getTotalStars() + stars;
                user.setTotalStars(newStars);

                // 更新最高关卡
                boolean isNewRecord = dto.getLevel() > user.getHighestLevel();
                if (isNewRecord) {
                    user.setHighestLevel(dto.getLevel());
                }

                // 判断是否首次通关该关卡
                boolean isFirstClear = !isLevelCleared(dto.getUserId(), dto.getLevel());
                dto.setIsFirstClear(isFirstClear);

                // 计算奖励金币
                int coinsEarned = calcRewardCoins(stars, dto.getLevel(), isFirstClear);

                // 更新用户金币
                int currentCoins = user.getCoins() != null ? user.getCoins() : 0;
                user.setCoins(currentCoins + coinsEarned);
                user.setUpdatedAt(LocalDateTime.now());
                userService.updateById(user);

                // 填充奖励响应
                dto.setCoinsEarned(coinsEarned);
                dto.setTotalCoins(user.getCoins());
                dto.setRewardMessage(buildRewardMessage(stars, coinsEarned, isFirstClear, isNewRecord));
            }
        }

        return record;
    }

    /** 检查用户是否已通关某关卡 */
    private boolean isLevelCleared(Long userId, int level) {
        LambdaQueryWrapper<GameRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(GameRecord::getUserId, userId)
               .eq(GameRecord::getLevel, level)
               .eq(GameRecord::getIsWin, true);
        return count(wrapper) > 0;
    }

    /** 计算奖励金币 */
    private int calcRewardCoins(int stars, int level, boolean isFirstClear) {
        int starIndex = Math.min(Math.max(stars, 1), 3) - 1;
        int coins = COINS_PER_STAR[starIndex] + level * LEVEL_BONUS[starIndex];
        if (isFirstClear) {
            coins += FIRST_CLEAR_BONUS;
        }
        return coins;
    }

    /** 构建奖励提示消息 */
    private String buildRewardMessage(int stars, int coinsEarned, boolean isFirstClear, boolean isNewRecord) {
        StringBuilder sb = new StringBuilder();
        switch (stars) {
            case 3:
                sb.append("完美通关！");
                break;
            case 2:
                sb.append("不错表现！");
                break;
            default:
                sb.append("通关成功！");
                break;
        }
        sb.append("获得 ").append(coinsEarned).append(" 金币");
        if (isFirstClear) {
            sb.append("（含首次通关+").append(FIRST_CLEAR_BONUS).append("）");
        }
        if (isNewRecord) {
            sb.append(" 🆕新纪录！");
        }
        return sb.toString();
    }

    @Override
    public IPage<GameRecord> getRecords(Long userId, int page, int size) {
        Page<GameRecord> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<GameRecord> wrapper = new LambdaQueryWrapper<>();
        if (userId != null) {
            wrapper.eq(GameRecord::getUserId, userId);
        }
        wrapper.orderByDesc(GameRecord::getCreatedAt);
        return page(pageParam, wrapper);
    }
}
